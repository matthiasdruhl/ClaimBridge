"""Explicit paid evaluation: three runs per scenario; no fixture candidate is sent to the model.

Run with PYTHONPATH=apps/api/src .venv/bin/python scripts/evaluate_live.py
Outputs actual candidate snapshots plus run metadata under ignored var/evaluations/.
"""

import argparse
import json
import time
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from claimbridge import create_app
from claimbridge.infrastructure.llm import ModelProvider
from live_gates import original_gates, packet_gates

ROOT = Path(__file__).resolve().parents[1]


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run only the original five-document case once.",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Verify provider access with a tiny structured response.",
    )
    parser.add_argument("--scenario", choices=["original", "office", "authorization"])
    parser.add_argument("--repetitions", type=int, choices=range(1, 4), default=3)
    args = parser.parse_args()
    if not ModelProvider().ready:
        raise SystemExit(
            "Configure CLAIMBRIDGE_API_KEY, CLAIMBRIDGE_API_BASE_URL and CLAIMBRIDGE_MODEL first."
        )
    if args.probe:
        provider = ModelProvider()
        started = time.monotonic()
        result = provider.complete(
            [{"role": "user", "content": "Return JSON with ok equal to true."}],
            {
                "type": "object",
                "properties": {"ok": {"type": "boolean"}},
                "required": ["ok"],
                "additionalProperties": False,
            },
        )
        if result != {"ok": True}:
            raise SystemExit("Provider probe returned an unexpected result.")
        print(
            "Provider access and structured response verified:",
            round(time.monotonic() - started, 2),
            "seconds",
        )
        return
    folder = ROOT / "var/evaluations" / uuid4().hex
    folder.mkdir(parents=True)

    class EvaluationProvider(ModelProvider):
        """Retain synthetic candidates only in this explicit evaluation directory."""

        def complete(self, messages, schema):
            attempt = len(list(folder.glob("candidate-*.json"))) + 1
            print("Provider generation", attempt, "started", flush=True)
            started = time.monotonic()
            result = super().complete(messages, schema)
            (folder / f"candidate-{attempt}.json").write_text(
                json.dumps(result, indent=2)
            )
            print(
                "Provider generation completed in",
                round(time.monotonic() - started, 2),
                "seconds",
                flush=True,
            )
            return result

        def extract(self, messages, schema, validator):
            def review(candidate):
                try:
                    return validator(candidate)
                except Exception as error:
                    print("Candidate validation:", str(error), flush=True)
                    raise

            return super().extract(messages, schema, review)

    app = create_app(
        {"DATA_DIR": folder / "data", "MODEL_PROVIDER": EvaluationProvider()}
    )
    client = app.test_client()
    records = []
    scenarios = (
        ("original",)
        if args.smoke
        else (
            (args.scenario,)
            if args.scenario
            else ("original", "office", "authorization")
        )
    )
    for scenario in scenarios:
        source = (
            ROOT / "claimbridge-prep/demo-case/documents"
            if scenario == "original"
            else ROOT / "tests/fixtures/scenarios" / scenario
        )
        files = sorted(source.glob("*.pdf"))
        if args.smoke:
            files = files[:5]
        for repetition in range(1, 2 if args.smoke else args.repetitions + 1):
            state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
            for index, path in enumerate(files):
                response = client.post(
                    f"/api/v1/workspaces/{state['id']}/documents",
                    data={
                        "expected_revision": state["revision"],
                        "file": (BytesIO(path.read_bytes()), path.name),
                    },
                )
                if response.status_code != 201:
                    raise SystemExit("Upload failed")
                state = response.json
                if index != len(files) - 1 and not (
                    scenario == "original" and index == 4
                ):
                    continue
                started = time.monotonic()
                response = client.post(
                    f"/api/v1/workspaces/{state['id']}/process",
                    json={
                        "expected_revision": state["revision"],
                        "document_ids": [
                            item["document"]["id"] for item in state["documents"]
                        ],
                    },
                )
                if response.status_code != 202:
                    raise SystemExit("Could not start analysis: " + str(response.json))
                app.extensions["analysis_worker"].queue.join()
                job = client.get("/api/v1/jobs/" + response.json["job_id"]).json
                actual = client.get(f"/api/v1/workspaces/{state['id']}/claim").json
                label = f"{scenario}-{repetition}-{index + 1}"
                (folder / f"{label}.json").write_text(json.dumps(actual, indent=2))
                claim = actual["claim"]
                outcome = (
                    "missing_information"
                    if scenario == "original" and index == 4
                    else "likely_correct"
                    if scenario == "office"
                    else "possible_processing_error"
                )
                passed = bool(
                    job["status"] == "succeeded"
                    and claim
                    and claim["corrected_liability_cents"]["value"] is None
                    and claim["denial"]["deadline"]["value"] is None
                    and any(item["outcome"] == outcome for item in claim["conclusions"])
                )
                checks = (
                    original_gates(claim, index == 5)
                    if scenario == "original" and claim
                    else {}
                )
                if scenario != "original" and claim:
                    checks = packet_gates(
                        claim,
                        json.loads((source / "expected-extraction.json").read_text()),
                    )
                passed = passed and all(item["passed"] for item in checks.values())
                records.append(
                    {
                        "run": label,
                        "job": job,
                        "automatic_gate": passed,
                        "field_checks": checks,
                        "elapsed_seconds": round(time.monotonic() - started, 2),
                        "metadata": actual["metadata"],
                        "human_citation_review": "pending",
                    }
                )
                (folder / "summary.json").write_text(json.dumps(records, indent=2))
                print(label, job["status"], "automatic gate:", passed)
                if not passed:
                    print("Failure details:", json.dumps(job))
                    raise SystemExit(
                        "Stopped after failed analysis. Results: " + str(folder)
                    )
    print("Results:", folder, "\nHuman citation/entailment review is still required.")
    if not all(record["automatic_gate"] for record in records):
        raise SystemExit(1)


if __name__ == "__main__":
    run()
