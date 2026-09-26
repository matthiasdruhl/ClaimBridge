"""Exercise saved actual-model results without allowing any further provider request."""

import argparse
import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from claimbridge import create_app


def verify(folder):
    records = json.loads((folder / "summary.json").read_text())
    completed = [
        item
        for item in records
        if item["run"].startswith("original-")
        and item["run"].endswith("-6")
        and item["automatic_gate"]
    ]
    if not completed:
        raise SystemExit("No successful clarified original result to verify.")
    data = folder / ("workflow-data-" + uuid4().hex)
    data.mkdir()
    with (
        sqlite3.connect(folder / "data/workspaces.sqlite3") as source,
        sqlite3.connect(data / "workspaces.sqlite3") as destination,
    ):
        source.backup(destination)
    reports = []
    for record in completed:
        configuration = record["metadata"]["configuration"]

        class NoNetworkProvider:
            ready = True

            def __init__(self, settings):
                self.configuration = settings

            def extract(self, *args):
                raise AssertionError(
                    "Verification must reuse the saved live extraction."
                )

        app = create_app(
            {
                "DATA_DIR": data,
                "MODEL_PROVIDER": NoNetworkProvider(configuration),
            }
        )
        client = app.test_client()
        prefix = "/api/v1/workspaces/" + record["job"]["workspace_id"]
        state = client.get(prefix).json
        before = client.get(prefix + "/claim").json
        assert before["claim"] and before["analysis_status"] != "stale"
        old_revision = state["revision"]
        draft_response = client.post(
            prefix + "/appeal-draft", json={"expected_revision": old_revision}
        )
        assert draft_response.status_code == 201, draft_response.json
        draft = draft_response.json
        assert draft["submitted"] is False
        state = client.post(
            prefix + "/questions/Q-receipt/answer",
            json={"expected_revision": old_revision, "answer": "2026-09-01"},
        ).json
        assert client.get(prefix + "/claim").json["analysis_status"] == "stale"
        assert client.get(prefix + "/appeal-drafts/" + draft["draft_id"]).json["stale"]
        assert (
            client.post(
                prefix + "/action-plan", json={"expected_revision": state["revision"]}
            ).status_code
            == 409
        )
        response = client.post(
            prefix + "/process",
            json={
                "expected_revision": state["revision"],
                "document_ids": [item["document"]["id"] for item in state["documents"]],
            },
        )
        assert response.status_code == 202, response.json
        app.extensions["analysis_worker"].queue.join()
        result = client.get(prefix + "/claim").json
        assert result["job"]["status"] == "succeeded", result["job"]
        assert result["metadata"]["provider_outcome"] == "reused_validated_extraction"
        assert result["claim"]["denial"]["deadline"]["value"] == "2027-02-28"
        assert result["claim"]["denial"]["received_date"]["status"] == "user_reported"
        assert result["claim"]["corrected_liability_cents"]["value"] is None
        historical = client.get(prefix + f"/claim?revision={old_revision}").json
        assert historical["claim"]["denial"]["deadline"]["value"] is None
        generated = client.post(
            prefix + "/appeal-draft", json={"expected_revision": state["revision"]}
        ).json
        text = (
            generated["text"]
            + "\n\nSynthetic rehearsal: reviewed the source documents."
        )
        edited = client.put(
            prefix + "/appeal-drafts/" + generated["draft_id"],
            json={
                "expected_revision": state["revision"],
                "expected_version": generated["version"],
                "text": text,
            },
        )
        assert edited.status_code == 200, edited.json
        reopened = client.get(prefix + "/appeal-drafts/" + generated["draft_id"]).json
        assert (
            reopened["text"] == text
            and reopened["user_edited"]
            and not reopened["submitted"]
        )
        assert (
            client.put(
                prefix + "/appeal-drafts/" + generated["draft_id"],
                json={
                    "expected_revision": state["revision"],
                    "expected_version": generated["version"],
                    "text": "Stale edit",
                },
            ).status_code
            == 409
        )
        reports.append(
            {
                "source_run": record["run"],
                "passed": True,
                "provider_calls": 0,
                "verification_data": str(data),
                "regeneration_ms": result["metadata"]["elapsed_ms"],
                "workspace_id": state["id"],
                "draft_id": generated["draft_id"],
            }
        )
    output = folder / "workflow-verification.json"
    output.write_text(json.dumps(reports, indent=2) + "\n")
    print(json.dumps(reports, indent=2))
    print("Saved:", output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    verify(parser.parse_args().directory.resolve())
