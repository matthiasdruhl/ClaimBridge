"""Retained, provider-generated synthetic results for an explicit demo path."""

import copy
import json
from pathlib import Path

from claimbridge.domain.validation import validate_extraction
from claimbridge.infrastructure.workspaces import WorkspaceError

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "demo_fixtures" / "synthetic-network-v1.json"


class DemoFixtureCatalog:
    """Match exact document hashes and restore a validated extraction snapshot."""

    def __init__(self, path=FIXTURE_PATH):
        self.path = Path(path)
        self.data = json.loads(self.path.read_text())

    @property
    def configuration(self):
        provenance = self.data["provenance"]
        return {
            "mode": "retained_validated_demo",
            "fixture_id": self.data["fixture_id"],
            "pipeline_version": provenance["pipeline_version"],
            "prompt_version": provenance["prompt_version"],
            "schema_hash": provenance["schema_hash"],
        }

    def _snapshot(self, documents):
        hashes = sorted(item["document"]["sha256"] for item in documents)
        for snapshot in self.data["snapshots"]:
            if hashes == sorted(snapshot["document_sha256"]):
                return snapshot
        raise WorkspaceError(
            "This document set is not part of the saved demo case. "
            "Turn off Demo Mode to analyze new documents.",
            422,
        )

    def require_known(self, documents):
        self._snapshot(documents)

    def extraction(self, workspace, documents, as_of):
        snapshot = self._snapshot(documents)
        current_ids = {item["document"]["sha256"]: item["document"]["id"] for item in documents}
        claim = copy.deepcopy(snapshot["extracted_claim"])
        for evidence in claim["evidence"]:
            digest = evidence["document_id"]
            if digest not in current_ids:
                raise WorkspaceError("Saved demo evidence does not match this workspace.", 422)
            evidence["document_id"] = current_ids[digest]
        claim.update(revision=workspace["revision"], as_of=as_of)
        validated = validate_extraction(claim, workspace, documents, as_of)
        return validated, {
            "fixture_id": self.data["fixture_id"],
            "snapshot_id": snapshot["snapshot_id"],
            "source_run": snapshot["source_run"],
            "recorded_at": self.data["provenance"]["recorded_at"],
            "source_provider_outcome": snapshot["provider_outcome"],
            "source_elapsed_ms": snapshot["elapsed_ms"],
        }
