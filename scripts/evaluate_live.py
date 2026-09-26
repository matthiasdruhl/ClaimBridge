"""Explicit paid evaluation: three runs per scenario; no fixture candidate is sent to the model.

Run with PYTHONPATH=apps/api/src .venv/bin/python scripts/evaluate_live.py
Outputs actual candidate snapshots plus run metadata under ignored var/evaluations/.
"""
import json
import time
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from claimbridge import create_app
from claimbridge.infrastructure.llm import ModelProvider

ROOT = Path(__file__).resolve().parents[1]


def run():
    if not ModelProvider().ready:
        raise SystemExit("Configure CLAIMBRIDGE_API_KEY, CLAIMBRIDGE_API_BASE_URL and CLAIMBRIDGE_MODEL first.")
    folder = ROOT / "var/evaluations" / uuid4().hex
    folder.mkdir(parents=True)
    app = create_app({"DATA_DIR": folder / "data"})
    client = app.test_client()
    records = []
    for scenario in ("original", "office", "authorization"):
        source = (ROOT / "claimbridge-prep/demo-case/documents" if scenario == "original"
                  else ROOT / "tests/fixtures/scenarios" / scenario)
        files = sorted(source.glob("*.pdf"))
        for repetition in range(1, 4):
            state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
            for index, path in enumerate(files):
                response = client.post(f"/api/v1/workspaces/{state['id']}/documents", data={
                    "expected_revision": state["revision"], "file": (BytesIO(path.read_bytes()), path.name)})
                if response.status_code != 201:
                    raise SystemExit("Upload failed")
                state = response.json
                if index != len(files) - 1 and not (scenario == "original" and index == 4):
                    continue
                started = time.monotonic()
                response = client.post(f"/api/v1/workspaces/{state['id']}/process", json={
                    "expected_revision": state["revision"],
                    "document_ids": [item["document"]["id"] for item in state["documents"]]})
                if response.status_code != 202:
                    raise SystemExit("Could not start analysis: " + str(response.json))
                app.extensions["analysis_worker"].queue.join()
                job = client.get('/api/v1/jobs/' + response.json['job_id']).json
                actual = client.get(f"/api/v1/workspaces/{state['id']}/claim").json
                label = f"{scenario}-{repetition}-{index+1}"
                (folder / f"{label}.json").write_text(json.dumps(actual, indent=2))
                claim = actual['claim']
                outcome = ('missing_information' if scenario == 'original' and index == 4 else
                           'likely_correct' if scenario == 'office' else 'possible_processing_error')
                passed = bool(job['status'] == 'succeeded' and claim and
                              claim['corrected_liability_cents']['value'] is None and
                              claim['denial']['deadline']['value'] is None and
                              any(item['outcome'] == outcome for item in claim['conclusions']))
                records.append(dict(run=label, job=job, automatic_gate=passed,
                                    elapsed_seconds=round(time.monotonic()-started,2),
                                    metadata=actual['metadata'], human_citation_review='pending'))
                (folder / 'summary.json').write_text(json.dumps(records,indent=2))
                print(label, job['status'], 'automatic gate:', passed)
    print('Results:', folder, '\nHuman citation/entailment review is still required.')


if __name__ == '__main__':
    run()
