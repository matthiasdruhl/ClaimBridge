"""Exercise real PDF ingestion, persistence, revisions and isolation."""

from io import BytesIO
from pathlib import Path

from pypdf import PdfWriter

from claimbridge import create_app

FIXTURES = Path(__file__).resolve().parents[3] / "claimbridge-prep/demo-case/documents"


def test_real_documents_persist_and_deduplicate(tmp_path):
    client = create_app({"TESTING": True, "DATA_DIR": tmp_path}).test_client()
    state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
    url = f"/api/v1/workspaces/{state['id']}"
    for path in sorted(FIXTURES.glob("*.pdf")):
        response = client.post(
            url + "/documents",
            data={
                "file": (BytesIO(path.read_bytes()), path.name),
                "expected_revision": str(state["revision"]),
            },
        )
        assert response.status_code == 201
        state = response.json
        assert state["documents"][-1]["document"]["status"] == "ready"
    assert sum(len(item["pages"]) for item in state["documents"]) == 12
    path = sorted(FIXTURES.glob("*.pdf"))[0]
    duplicate = client.post(
        url + "/documents",
        data={
            "file": (BytesIO(path.read_bytes()), path.name),
            "expected_revision": state["revision"],
        },
    )
    assert duplicate.json["revision"] == state["revision"]
    stale = client.post(
        url + "/documents",
        data={"file": (BytesIO(path.read_bytes()), path.name), "expected_revision": 1},
    )
    assert stale.status_code == 409
    fresh = create_app({"TESTING": True, "DATA_DIR": tmp_path}).test_client()
    assert fresh.get(url).json == state
    doc_id = state["documents"][0]["document"]["id"]
    assert fresh.get(url + f"/documents/{doc_id}/content").data == path.read_bytes()
    other = client.post("/api/v1/workspaces", json={"synthetic": True}).json["id"]
    assert client.get(f"/api/v1/workspaces/{other}/documents/{doc_id}/content").status_code == 404


def test_invalid_encrypted_and_blank_pdfs(tmp_path):
    client = create_app({"TESTING": True, "DATA_DIR": tmp_path}).test_client()
    assert client.post("/api/v1/workspaces", json={"synthetic": False}).status_code == 400
    state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
    url = f"/api/v1/workspaces/{state['id']}/documents"
    for body, status in [(b"not pdf", 415), (b"%PDF-corrupt", 422)]:
        assert (
            client.post(
                url, data={"file": (BytesIO(body), "x.pdf"), "expected_revision": 1}
            ).status_code
            == status
        )
    for encrypted, expected in [(False, "needs_ocr"), (True, "encrypted")]:
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        if encrypted:
            writer.encrypt("password")
        stream = BytesIO()
        writer.write(stream)
        stream.seek(0)
        response = client.post(
            url, data={"file": (stream, "x.pdf"), "expected_revision": state["revision"]}
        )
        assert response.status_code == 201
        state = response.json
        assert state["documents"][-1]["document"]["status"] == expected
