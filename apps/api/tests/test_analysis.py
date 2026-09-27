"""Actual PDFs and test-only extraction candidates; not a live model accuracy claim."""

import copy
import json
from io import BytesIO
from pathlib import Path

import pytest

from claimbridge import create_app
from claimbridge.domain.contracts import ValidationFailure, fact, unknown, validate
from claimbridge.domain.reasoning import analyze
from claimbridge.domain.validation import validate_extraction
from claimbridge.infrastructure.analysis_store import AnalysisStore
from claimbridge.infrastructure.retrieval import plan_retrieval

ROOT = Path(__file__).resolve().parents[3]
PREP = ROOT / "claimbridge-prep"


def candidate(documents, clarified=False):
    name = "expected-clarified.json" if clarified else "expected-initial.json"
    claim = json.loads((PREP / "demo-case" / name).read_text())
    doc_map = {f"D{index:02}": item["document"]["id"] for index, item in enumerate(documents, 1)}
    claim["evidence"] = [item for item in claim["evidence"] if item["document_id"] in doc_map]
    for item in claim["evidence"]:
        item["document_id"] = doc_map[item["document_id"]]
    claim["eobs"][1]["deductible_used_cents"] = unknown("Fully met without a quoted numeric amount")
    claim["denial"]["received_date"] = unknown()
    claim["plan"]["appeal_days"] = fact(180, ["D01:P13"])
    claim["plan"]["appeal_trigger"] = fact("receipt_calendar_days", ["D01:P13"])
    claim["denial"]["claim_id"] = fact(claim["id"], ["D03:N1"])
    return claim


class TestProvider:
    __test__ = False
    ready = True
    configuration = {"model": "TEST-ONLY", "prompt_version": "test", "mode": "test_double"}

    def __init__(self):
        self.calls = 0

    def extract(self, messages, schema, validator):
        self.calls += 1
        data = json.loads(messages[1]["content"])
        documents = [
            dict(document={"id": item["document_id"]}, pages=item["pages"])
            for item in data["documents"]
        ]
        # Remap test-only fixture IDs to the actual uploaded documents.
        by_id = {item["document"]["id"]: item for item in documents}
        ordered = [by_id[key] for key in self.document_ids]
        return validator(candidate(ordered, clarified=len(ordered) == 6))


def setup_case(tmp_path, count=5):
    provider = TestProvider()
    app = create_app({"TESTING": True, "DATA_DIR": tmp_path, "MODEL_PROVIDER": provider})
    client = app.test_client()
    state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
    for path in sorted((PREP / "demo-case/documents").glob("*.pdf"))[:count]:
        response = client.post(
            f"/api/v1/workspaces/{state['id']}/documents",
            data={
                "expected_revision": state["revision"],
                "file": (BytesIO(path.read_bytes()), path.name),
            },
        )
        assert response.status_code == 201
        state = response.json
    provider.document_ids = [item["document"]["id"] for item in state["documents"]]
    return app, client, state, provider


def process(app, client, state):
    response = client.post(
        f"/api/v1/workspaces/{state['id']}/process",
        json={
            "expected_revision": state["revision"],
            "document_ids": [item["document"]["id"] for item in state["documents"]],
        },
    )
    assert response.status_code == 202, response.json
    app.extensions["analysis_worker"].queue.join()
    job = client.get("/api/v1/jobs/" + response.json["job_id"]).json
    assert job["status"] == "succeeded", job
    return client.get(f"/api/v1/workspaces/{state['id']}/claim").json


def test_original_flow_clarification_drafts_and_staleness(tmp_path):
    app, client, state, provider = setup_case(tmp_path)
    prefix = f"/api/v1/workspaces/{state['id']}"
    result = process(app, client, state)
    claim = result["claim"]
    assert claim["corrected_liability_cents"]["value"] is None
    assert claim["denial"]["deadline"]["value"] is None
    assert len(claim["eobs"]) == 2
    assert claim["eobs"][0]["financial"]["allowed_cents"]["value"] is None
    assert claim["eobs"][0]["financial"]["paid_cents"]["value"] == 0
    assert claim["conclusions"][1]["classification"] == "conditional"
    first_job = result["job"]["job_id"]
    assert process(app, client, state)["job"]["job_id"] == first_job
    assert provider.calls == 1
    draft = client.post(
        prefix + "/appeal-draft", json={"expected_revision": state["revision"]}
    ).json
    assert draft["submitted"] is False
    edited = client.put(
        prefix + "/appeal-drafts/" + draft["draft_id"],
        json={
            "expected_revision": state["revision"],
            "expected_version": 1,
            "text": "My edited draft",
        },
    )
    assert edited.json["version"] == 2
    assert (
        client.put(
            prefix + "/appeal-drafts/" + draft["draft_id"],
            json={"expected_revision": state["revision"], "expected_version": 1, "text": "stale"},
        ).status_code
        == 409
    )
    old_revision = state["revision"]
    state = client.post(
        prefix + "/questions/Q-receipt/answer",
        json={"expected_revision": old_revision, "answer": "2026-09-01"},
    ).json
    assert client.get(prefix + "/claim").json["analysis_status"] == "stale"
    assert client.get(prefix + "/appeal-drafts/" + draft["draft_id"]).json["stale"] is True
    assert (
        client.post(
            prefix + "/action-plan", json={"expected_revision": state["revision"]}
        ).status_code
        == 409
    )
    result = process(app, client, state)
    assert provider.calls == 1
    assert result["claim"]["denial"]["deadline"]["value"] == "2027-02-28"
    path = PREP / "demo-case/documents/06-location-confirmation.pdf"
    state = client.post(
        prefix + "/documents",
        data={
            "expected_revision": state["revision"],
            "file": (BytesIO(path.read_bytes()), path.name),
        },
    ).json
    provider.document_ids = [item["document"]["id"] for item in state["documents"]]
    result = process(app, client, state)
    assert result["claim"]["services"][0]["submitted_pos"]["value"] == "11"
    assert result["claim"]["conclusions"][1]["outcome"] == "possible_processing_error"
    assert {"R02", "R03"} <= {item["id"] for item in result["claim"]["evidence"]}
    assert (
        client.get(prefix + f"/claim?revision={old_revision}").json["claim"]["denial"]["deadline"][
            "value"
        ]
        is None
    )


def test_fabricated_quotes_and_foreign_references_rejected(tmp_path):
    _, _, state, _ = setup_case(tmp_path)
    original = candidate(state["documents"])
    original["evidence"][0]["text"] = "This source was invented and is not in the actual PDF."
    with pytest.raises(ValidationFailure, match="QUOTE_NOT_FOUND"):
        validate_extraction(original, state, state["documents"], "2026-09-26")
    original = candidate(state["documents"])
    original["plan"]["id"]["evidence_ids"] = ["FOREIGN"]
    with pytest.raises(ValidationFailure, match="REFERENCE_INVALID"):
        validate_extraction(original, state, state["documents"], "2026-09-26")


def test_claim_identity_uses_validated_denial_and_matching_eob(tmp_path):
    _, _, state, _ = setup_case(tmp_path)
    extracted = candidate(state["documents"])
    extracted["id"] = state["id"]
    result = validate_extraction(extracted, state, state["documents"], "2026-09-26")
    assert result["id"] == "SYN-C260812-A"


def test_unlinked_facility_identifier_is_rejected(tmp_path):
    _, _, state, _ = setup_case(tmp_path, count=6)
    extracted = candidate(state["documents"], clarified=True)
    facility = next(item for item in extracted["providers"] if item["role"] == "facility")
    old_id = facility["id"]
    facility["id"] = "unlinked-alias"
    for service in extracted["services"]:
        if service["provider_id"] == old_id:
            service["provider_id"] = facility["id"]
    with pytest.raises(ValidationFailure, match="FACILITY_REFERENCE_INVALID"):
        validate_extraction(extracted, state, state["documents"], "2026-09-26")


def test_office_and_authorization_routes(tmp_path):
    _, _, state, _ = setup_case(tmp_path)
    base = validate_extraction(
        candidate(state["documents"]), state, state["documents"], "2026-09-26"
    )
    office = copy.deepcopy(base)
    office["services"][0]["actual_setting"] = fact("office", ["D02:E3"])
    result, supported = analyze(office, [], plan_retrieval(office))
    assert not supported
    assert result["conclusions"][1]["outcome"] == "likely_correct"
    authorization = copy.deepcopy(base)
    authorization["denial"]["type"] = fact("authorization", ["D03:N1"])
    authorization["authorizations"][0].update(
        provider_id=fact("SYN-P-AN1", ["D05:A1"]), service_code=fact("SYN-AN-KNEE", ["D05:A1"])
    )
    result, _ = analyze(authorization, [], plan_retrieval(authorization))
    assert result["conclusions"][1]["outcome"] == "possible_processing_error"
    authorization["authorizations"][0]["end"]["value"] = "2026-08-11"
    result, _ = analyze(authorization, [], plan_retrieval(authorization))
    assert result["conclusions"][1]["outcome"] == "missing_information"
    validate("claim", result)


def test_restart_and_obsolete_jobs(tmp_path):
    app, _, state, provider = setup_case(tmp_path)
    store = app.extensions["analysis_store"]
    ids = provider.document_ids
    job, _ = store.start(state["id"], state["revision"], ids, provider.configuration, "")
    store.answer(state["id"], state["revision"], "Q-payment", "No newer records", [])
    app.extensions["analysis_worker"].run(job["job_id"])
    assert store.job(job["job_id"])["status"] == "obsolete"
    assert store.latest(state["id"]) is None
    state = store.workspaces.get(state["id"])
    job, _ = store.start(state["id"], state["revision"], ids, provider.configuration, "")
    restarted = AnalysisStore(store.workspaces)
    assert restarted.job(job["job_id"])["error"] == "PROCESS_INTERRUPTED"
    assert restarted.job(job["job_id"])["retryable"]


def test_unexpected_failure_logs_locations_without_sensitive_message(tmp_path, caplog):
    app, _, state, provider = setup_case(tmp_path)
    store = app.extensions["analysis_store"]

    def fail(*args):
        raise RuntimeError("SECRET-provider-body-and-credential")

    provider.extract = fail
    job, _ = store.start(
        state["id"], state["revision"], provider.document_ids, provider.configuration, ""
    )
    app.extensions["analysis_worker"].run(job["job_id"])
    assert store.job(job["job_id"])["error"] == "PROCESSING_FAILED"
    assert "RuntimeError" in caplog.text
    assert "test_analysis.py" in caplog.text
    assert job["job_id"] in caplog.text
    assert "SECRET-provider-body-and-credential" not in caplog.text
    assert store.latest(state["id"]) is None


def test_provider_missing_no_job_started(tmp_path, monkeypatch):
    monkeypatch.delenv("CLAIMBRIDGE_API_KEY", raising=False)
    app = create_app({"TESTING": True, "DATA_DIR": tmp_path})
    client = app.test_client()
    state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
    response = client.post(
        f"/api/v1/workspaces/{state['id']}/process",
        json={"expected_revision": 1, "document_ids": []},
    )
    assert response.status_code == 503
    assert response.json["error"]["code"] == "PROVIDER_NOT_CONFIGURED"


@pytest.mark.parametrize("scenario", ["office", "authorization"])
def test_independent_packets_through_pipeline(tmp_path, scenario):
    folder = ROOT / "tests/fixtures/scenarios" / scenario

    class PacketProvider(TestProvider):
        def extract(self, messages, schema, validator):
            extracted = json.loads((folder / "expected-extraction.json").read_text())
            for item in extracted["evidence"]:
                item["document_id"] = self.mapping[item["document_id"]]
            return validator(extracted)

    provider = PacketProvider()
    app = create_app({"TESTING": True, "DATA_DIR": tmp_path, "MODEL_PROVIDER": provider})
    client = app.test_client()
    state = client.post("/api/v1/workspaces", json={"synthetic": True}).json
    provider.mapping = {}
    for path in sorted(folder.glob("*.pdf")):
        state = client.post(
            f"/api/v1/workspaces/{state['id']}/documents",
            data={
                "expected_revision": state["revision"],
                "file": (BytesIO(path.read_bytes()), path.name),
            },
        ).json
        provider.mapping[path.stem] = state["documents"][-1]["document"]["id"]
    result = process(app, client, state)
    expected = json.loads((folder / "expectations.json").read_text())
    assert result["claim"]["conclusions"][1]["outcome"] == expected["outcome"]
    assert result["claim"]["corrected_liability_cents"]["value"] is None
    assert result["claim"]["denial"]["deadline"]["value"] is None
    assert not any(item["id"] in {"R02", "R03"} for item in result["claim"]["evidence"])


def test_conflicts_unknown_money_deadlines_and_scope(tmp_path):
    _, _, state, _ = setup_case(tmp_path)
    base = validate_extraction(
        candidate(state["documents"]), state, state["documents"], "2026-09-26"
    )
    bad = copy.deepcopy(base)
    bad["eobs"][0]["financial"]["allowed_cents"] = dict(unknown(), value=0)
    with pytest.raises(ValidationFailure, match="UNKNOWN_FACT"):
        validate_extraction(bad, state, state["documents"], "2026-09-26")
    bad = copy.deepcopy(base)
    bad["eobs"][1]["claim_id"] = bad["eobs"][0]["claim_id"]
    with pytest.raises(ValidationFailure, match="MULTIPLE_ADJUDICATIONS"):
        validate_extraction(bad, state, state["documents"], "2026-09-26")
    bad = copy.deepcopy(base)
    bad["plan"]["appeal_trigger"] = unknown()
    answer = dict(id="U1", question_id="Q-receipt", answer="2026-09-01", revision=7)
    result, _ = analyze(bad, [answer], plan_retrieval(bad))
    assert result["denial"]["deadline"]["value"] is None
    result, _ = analyze(base, [dict(answer, answer="2026-01-01")], plan_retrieval(base))
    assert result["denial"]["deadline"]["value"] is None
    assert result["services"][0]["actual_setting"]["status"] == "conflicted"


def test_user_location_does_not_become_verified_and_conflicts_block_support(tmp_path):
    _, _, state, _ = setup_case(tmp_path, count=6)
    base = validate_extraction(
        candidate(state["documents"], clarified=True), state, state["documents"], "2026-09-26"
    )
    answer = dict(id="U-location", question_id="Q-location", answer="office", revision=8)
    result, supported = analyze(base, [answer], plan_retrieval(base))
    assert not supported
    assert result["services"][0]["actual_setting"]["status"] == "conflicted"
    assert result["services"][0]["submitted_pos"]["value"] == "11"
    base["services"][0]["actual_setting"] = unknown()
    result, supported = analyze(base, [dict(answer, answer="asc")], plan_retrieval(base))
    assert not supported
    assert result["services"][0]["actual_setting"]["status"] == "user_reported"
