"""Diagnostics correlation, privacy, retention and failure isolation."""

from io import BytesIO
from uuid import uuid4

from claimbridge import create_app


def setup(tmp_path):
    app = create_app({"TESTING": True, "DATA_DIR": tmp_path, "DIAGNOSTICS_ENABLED": True})
    return app, app.test_client(), app.extensions["diagnostics"]


def test_correlation_and_polling_exclusion(tmp_path):
    _, client, store = setup(tmp_path)
    request_id = uuid4().hex
    response = client.post(
        "/api/v1/workspaces", json={"synthetic": True}, headers={"X-Request-ID": request_id}
    )
    assert response.headers["X-Request-ID"] == request_id
    workspace = response.json["id"]
    response = client.post(
        f"/api/v1/workspaces/{workspace}/documents",
        data={
            "file": (BytesIO(b"private document text"), "secret-name.pdf"),
            "expected_revision": 1,
        },
        headers={"X-Request-ID": request_id},
    )
    assert response.status_code == 415
    assert response.json["request_id"] == request_id
    rows = store.read(request_id=request_id)
    assert [row["operation"] for row in rows].count("pdf.extract") == 2
    assert "private document" not in str(rows) and "secret-name" not in str(rows)
    before = len(rows)
    assert client.get("/api/v1/diagnostics/status").json["status"] == "connected"
    assert client.get("/api/v1/diagnostics/events").status_code == 200
    assert len(store.read()) == before


def test_event_validation_deduplication_and_retention(tmp_path):
    _, client, store = setup(tmp_path)
    event = dict(
        id=uuid4().hex,
        request_id=uuid4().hex,
        operation="workspace.read",
        outcome="completed",
        status=200,
    )
    for _ in range(2):
        assert (
            client.post("/api/v1/diagnostics/events", json={"events": [event]}).status_code == 204
        )
    assert len(store.read(source="frontend")) == 1
    assert store.read(source="backend") == []
    assert store.read(after=store.read()[0]["seq"]) == []
    event["body"] = "secret"
    assert client.post("/api/v1/diagnostics/events", json={"events": [event]}).status_code == 400
    with store.connect() as db:
        db.execute("UPDATE events SET timestamp=0")
    assert store.read() == []
    store.record(operation="test")
    with store.connect() as db:
        assert db.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 1


def test_failed_storage_does_not_break_requests(tmp_path):
    app, client, store = setup(tmp_path)
    store.path = tmp_path / "missing" / "events.sqlite3"
    assert client.post("/api/v1/workspaces", json={"synthetic": True}).status_code == 201
    assert client.get("/api/v1/diagnostics/status").json["logging"] == "unavailable"


def test_unexpected_error_is_sanitized(tmp_path):
    app, client, store = setup(tmp_path)

    @app.route("/explode")
    def explode():
        raise RuntimeError("SECRET CONTENT")

    response = client.get("/explode")
    assert response.status_code == 500
    assert "SECRET" not in response.get_data(as_text=True)
    assert store.read()[0]["status"] == 500


def test_disabled_by_default(tmp_path):
    client = create_app(
        {"TESTING": True, "DATA_DIR": tmp_path, "DIAGNOSTICS_ENABLED": False}
    ).test_client()
    assert client.get("/api/v1/diagnostics/status").status_code == 404
