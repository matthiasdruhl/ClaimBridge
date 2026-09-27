"""Export the checked-in demo fixture from a retained validated evaluation DB."""

import argparse
import copy
import json
import sqlite3
from pathlib import Path


WORKSPACE_ID = "59c049d641354c6db796b92aad9aa9c4"
RUNS = {6: "original-1-5", 7: "original-1-6"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with sqlite3.connect(args.database) as db:
        workspace = json.loads(
            db.execute("SELECT data FROM workspaces WHERE id=?", (WORKSPACE_ID,)).fetchone()[0]
        )
        digest_by_id = {
            item["document"]["id"]: item["document"]["sha256"]
            for item in workspace["documents"]
        }
        rows = db.execute(
            "SELECT revision,metadata FROM claim_revisions "
            "WHERE workspace_id=? AND revision IN (6,7) ORDER BY revision",
            (WORKSPACE_ID,),
        ).fetchall()

    snapshots = []
    provenance = None
    for revision, raw_metadata in rows:
        metadata = json.loads(raw_metadata)
        extracted = copy.deepcopy(metadata["extracted_claim"])
        for evidence in extracted["evidence"]:
            evidence["document_id"] = digest_by_id[evidence["document_id"]]
        configuration = metadata["configuration"]
        provenance = provenance or {
            "evaluation_id": args.database.parent.parent.name,
            "workspace_id": WORKSPACE_ID,
            "recorded_at": "2026-09-26",
            "provider": "Meta",
            "model": configuration["model"],
            "prompt_version": configuration["prompt_version"],
            "pipeline_version": configuration["pipeline_version"],
            "schema_hash": configuration["schema_hash"],
            "documentation": "docs/live-validation.md",
        }
        snapshots.append(
            {
                "snapshot_id": "initial-01-05" if revision == 6 else "clarified-01-06",
                "source_run": RUNS[revision],
                "provider_outcome": metadata["provider_outcome"],
                "elapsed_ms": metadata["elapsed_ms"],
                "document_sha256": sorted(metadata["document_hashes"].values()),
                "extracted_claim": extracted,
            }
        )

    fixture = {
        "fixture_id": "synthetic-network-v1",
        "description": "Retained validated extraction for the synthetic network demo case.",
        "provenance": provenance,
        "snapshots": snapshots,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
