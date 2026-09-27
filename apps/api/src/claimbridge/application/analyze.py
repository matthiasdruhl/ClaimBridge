"""One sequential worker, real persisted stages and validated immutable results."""

import copy
import hashlib
import json
import logging
import queue
import threading
import time
import traceback
from pathlib import Path

from claimbridge.domain.contracts import ValidationFailure, extraction_schema, validate
from claimbridge.domain.reasoning import action_plan, analyze
from claimbridge.domain.validation import validate_extraction
from claimbridge.infrastructure.llm import ProviderFailure, ProviderUnavailable
from claimbridge.infrastructure.retrieval import external_sources, plan_retrieval
from claimbridge.infrastructure.source_passages import hydrate_evidence, source_passages

PROMPT = (Path(__file__).resolve().parents[1] / "infrastructure/prompts/extract.txt").read_text()


class AnalysisWorker:
    def __init__(self, store, provider, events=None):
        self.store, self.provider, self.events = store, provider, events
        self.queue = queue.Queue()
        self.thread = None
        self.lock = threading.Lock()

    @property
    def configuration(self):
        return {
            **self.provider.configuration,
            "pipeline_version": "bounded-analysis-v3",
            "schema_hash": hashlib.sha256(
                json.dumps(extraction_schema(), sort_keys=True).encode()
            ).hexdigest(),
        }

    def enqueue(self, job_id):
        with self.lock:
            if self.thread is None:
                self.thread = threading.Thread(
                    target=self._loop, daemon=True, name="claimbridge-analysis"
                )
                self.thread.start()
        self.queue.put(job_id)

    def _loop(self):
        while True:
            job_id = self.queue.get()
            if job_id is None:
                self.queue.task_done()
                return
            try:
                self.run(job_id)
            finally:
                self.queue.task_done()

    def event(self, job_id, payload, stage, outcome, duration=0):
        if self.events:
            self.events.record(
                operation="analysis." + stage,
                outcome=outcome,
                request_id=payload["request_id"],
                job_id=job_id,
                stage=stage,
                duration_ms=duration,
                severity="error" if outcome == "failed" else "info",
            )

    def run(self, job_id):
        start = time.monotonic()
        payload = self.store.payload(job_id)
        workspace, documents = payload["workspace"], payload["documents"]

        def stage(name):
            self.store.stage(job_id, name)
            self.event(job_id, payload, name, "started")

        try:
            stage("extracting")
            hashes = {item["document"]["id"]: item["document"]["sha256"] for item in documents}
            previous = self.store.latest(workspace["id"])
            if (
                previous
                and previous["metadata"].get("document_hashes") == hashes
                and previous["metadata"].get("configuration") == payload["config"]
            ):
                claim = copy.deepcopy(previous["metadata"]["extracted_claim"])
                claim.update(revision=workspace["revision"], as_of=payload["as_of"])
                provider_outcome = "reused_validated_extraction"
            else:
                catalog, source_documents = source_passages(documents)
                inputs = dict(
                    workspace_id=workspace["id"],
                    revision=workspace["revision"],
                    as_of=payload["as_of"],
                    documents=source_documents,
                )
                messages = [
                    {"role": "system", "content": PROMPT},
                    {"role": "user", "content": json.dumps(inputs)},
                ]
                claim = self.provider.extract(
                    messages,
                    extraction_schema(catalog),
                    lambda value: validate_extraction(
                        hydrate_evidence(value, catalog), workspace, documents, payload["as_of"]
                    ),
                )
                provider_outcome = "validated"
            extracted_claim = copy.deepcopy(claim)
            self.event(job_id, payload, "provider", provider_outcome)
            stage("retrieving")
            plan_ids = plan_retrieval(claim)
            stage("analyzing")
            answers = [
                item
                for item in self.store.answers(workspace["id"])
                if item["revision"] <= workspace["revision"]
            ]
            claim, supported = analyze(claim, answers, plan_ids)
            claim["evidence"] += external_sources(claim, supported)
            if supported:
                external_ids = [
                    item["id"]
                    for item in claim["evidence"]
                    if item["domain"] == "external" and item["id"] in {"R02", "R03"}
                ]
                for conclusion in claim["conclusions"]:
                    if conclusion["id"] == "network-location":
                        conclusion["evidence_ids"] += external_ids
            stage("validating")
            validate("claim", claim)
            actions = action_plan(claim)
            evidence_ids = {item["id"] for item in claim["evidence"]}
            for conclusion in claim["conclusions"]:
                if not set(conclusion["evidence_ids"]) <= evidence_ids:
                    raise ValidationFailure("CONCLUSION_REFERENCE_INVALID")
            metadata = dict(
                document_hashes=hashes,
                extracted_claim=extracted_claim,
                configuration=payload["config"],
                provider_metrics=getattr(self.provider, "last_metrics", {})
                if provider_outcome == "validated"
                else {},
                provider_outcome=provider_outcome,
                elapsed_ms=round((time.monotonic() - start) * 1000),
                retrieved_evidence_ids=plan_ids,
                mode=payload["config"].get("mode", "live_model"),
                limitations=[
                    "Quotation matching does not prove semantic entailment.",
                    "Source summaries retain their recorded verification dates.",
                ],
            )
            saved = self.store.save(job_id, claim, actions, metadata)
            self.event(
                job_id,
                payload,
                "complete",
                "succeeded" if saved else "obsolete",
                metadata["elapsed_ms"],
            )
        except (ProviderUnavailable, ProviderFailure, ValidationFailure) as error:
            self.store.stage(job_id, "failed", "failed", str(error), retryable=True)
            self.event(
                job_id,
                payload,
                "validation" if isinstance(error, ValidationFailure) else "provider",
                "failed",
            )
        except Exception as error:
            # Record code locations only: exception messages and locals may contain source
            # documents, provider responses or credentials and must never enter logs.
            frames = traceback.extract_tb(error.__traceback__)
            logging.getLogger(__name__).error(
                "Unexpected analysis failure job=%s type=%s locations=%s",
                job_id,
                type(error).__name__,
                [(Path(frame.filename).name, frame.name, frame.lineno) for frame in frames],
            )
            self.store.stage(job_id, "failed", "failed", "PROCESSING_FAILED", retryable=True)
            self.event(job_id, payload, "processing", "failed")
