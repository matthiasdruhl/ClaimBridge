# API contracts v1

Design only. Prefix `/api/v1`; JSON except multipart uploads; all IDs opaque. Every mutating analysis request includes `expected_revision`; stale writes return 409. All outputs include evidence IDs and revision. Fetching a workspace never runs an LLM implicitly. No send-appeal endpoint.

| Method / route | Request | Response |
|---|---|---|
| POST /workspaces | `{ "synthetic":true, "as_of":"2026-09-24" }` | 201 `{ "id":"W1", "revision":1, "status":"empty" }` |
| POST /workspaces/W1/documents | multipart file, kind_hint, expected_revision | 201 `{ "document": Document, "revision":2, "deduplicated":false }` |
| POST /workspaces/W1/process | `{ "expected_revision":2, "document_ids":["D01","D02"] }` | 202 `{ "job_id":"J1", "status":"queued" }` |
| GET /jobs/J1 | none | 200 `{ "status":"running", "stage":"extracting", "document_id":"D02", "error":null }` |
| GET /workspaces/W1/claim | none | 200 `{ "claim": Claim, "analysis_status":"needs_information" }` |
| GET /workspaces/W1/evidence/D02:E3 | none | 200 EvidenceReference; source text and page |
| GET /workspaces/W1/documents/D02/content | none | application/pdf; only workspace-owned path |
| POST /workspaces/W1/questions/Q-receipt/answer | `{ "expected_revision":2, "answer":"2026-09-01", "supporting_document_ids":[] }` | 200 `{ "revision":3, "evidence_id":"U1", "analysis_status":"stale", "invalidated":["deadline","action_plan"] }` |
| POST /workspaces/W1/ask | `{ "revision":3, "question":"Why is this not a deductible charge?" }` | 200 `{ "answer":"The EOB assigns it to noncovered charges.", "evidence_ids":["D02:E2"], "classification":"fact", "revision":3 }` |
| POST /workspaces/W1/action-plan | `{ "expected_revision":3 }` | 200 ActionPlan using action-plan.schema.json |
| POST /workspaces/W1/appeal-draft | `{ "expected_revision":3, "argument_ids":["ARG-location"] }` | 200 `{ "draft_id":"AP1", "revision":3, "text":"...", "attachments":["D01","D02","D03","D04","D05","D06"], "unresolved_fields":["recognized_amount"], "submitted":false }` |
| DELETE /workspaces/W1 | expected_revision header | 204 after workspace documents/indexes are deleted |

## Error envelope

```json
{"error":{"code":"PDF_ENCRYPTED","message":"This PDF needs an unlocked copy.","document_id":"D02","retryable":false},"request_id":"REQ1"}
```

Use 400 invalid input/date; 404 unknown workspace/evidence; 409 stale revision; 413 size limit; 415 unsupported file; 422 schema or semantic validation failure; 503 model/source service unavailable. Job-level extraction errors do not discard successful documents. POST jobs use an idempotency key tied to workspace/revision/input hashes; duplicates return the existing job.

## Upload constraints and jobs

P0 limits: 20 MB per PDF, 100 pages, six initial/reveal fixture documents; these are product choices, not library limits. Inspect bytes and parser behavior rather than trusting extension. Job states queued/running/succeeded/failed; stage identifies upload/classify/extract/facts/analyze/validate. Poll every second while visible, stop on terminal state. Model timeout 30 seconds is a starting budget to measure, not a guaranteed latency. API contract examples abbreviate schema-bound objects; complete runnable examples are demo-case/expected-*.json.

## Implemented local ingestion slice (September 26)

POST /workspaces requires synthetic=true and returns the workspace with documents. GET /workspaces/{id} restores that snapshot. POST /workspaces/{id}/documents accepts file and expected_revision and currently extracts synchronously, returning the updated workspace rather than the planned document envelope. Each documents entry contains the canonical Document plus pages with id, page and text. Duplicate bytes leave revision unchanged. Originals are served by the content route above. Analysis/job endpoints remain unimplemented. This bounded local slice uses SQLite blobs; asynchronous processing is deferred.
