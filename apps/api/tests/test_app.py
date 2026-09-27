"""Smoke checks for the application factory and its actual route."""

from claimbridge import create_app


def test_liveness_is_explicit_about_scaffold():
    app = create_app({"TESTING": True})
    response = app.test_client().get("/api/v1/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "stage": "scaffold"}


def test_factories_do_not_share_configuration():
    first = create_app({"TESTING": True, "MAX_CONTENT_LENGTH": 10})
    second = create_app({"TESTING": True})
    assert first.config["MAX_CONTENT_LENGTH"] == 10
    assert second.config["MAX_CONTENT_LENGTH"] == 20 * 1024 * 1024


def test_serves_production_frontend_with_spa_fallback(tmp_path):
    frontend = tmp_path / "dist"
    assets = frontend / "assets"
    assets.mkdir(parents=True)
    (frontend / "index.html").write_text("<main>ClaimBridge</main>")
    (assets / "app.js").write_text("console.log('ClaimBridge')")
    client = create_app(
        {
            "TESTING": True,
            "DATA_DIR": tmp_path / "data",
            "FRONTEND_DIR": frontend,
        }
    ).test_client()

    assert client.get("/").data == b"<main>ClaimBridge</main>"
    assert client.get("/evaluation").data == b"<main>ClaimBridge</main>"
    assert client.get("/assets/app.js").data == b"console.log('ClaimBridge')"
    assert client.get("/api/missing").status_code == 404
