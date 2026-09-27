# API contracts v1

The table and error/job sections below describe the target design, not the complete running API. See the implemented ingestion and diagnostics sections for current behavior. Prefix `/api/v1`; JSON except multipart uploads; all IDs opaque. Every mutating analysis request includes `expected_revision`; stale writes return 409. All outputs include evidence IDs and revision. Fetching a workspace never runs an LLM implicitly. No send-appeal endpoint.

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

POST /workspaces requires synthetic=true and returns the workspace with documents. GET /workspaces/{id} restores that snapshot. POST /workspaces/{id}/documents accepts file and expected_revision and currently extracts synchronously, returning the updated workspace rather than the planned document envelope. Each documents entry contains the canonical Document plus pages with id, page and text. Duplicate bytes leave revision unchanged. Originals are served by the content route above. Analysis/job endpoints are now implemented as described in the claim-workflow section below. This bounded local slice uses SQLite blobs; asynchronous processing is deferred.


## Implemented local diagnostics (September 26)

Prefix `/api/v1/diagnostics`. Enabled by `CLAIMBRIDGE_DIAGNOSTICS=1` (set by `make dev-api`) or the application configuration `DIAGNOSTICS_ENABLED=True`. Otherwise these endpoints are absent. This is an unauthenticated local developer interface; leave it disabled for public deployments. It does not require model credentials or modify claim revisions.

| Method / route | Request | Response |
|---|---|---|
| GET /diagnostics/status | none | 200 `{ "status":"connected", "database":"ready", "logging":"ready", "uptime_seconds":42, "metrics":{"requests":12,"errors":2,"window_seconds":900} }` |
| GET /diagnostics/events | optional `after`, `source`, `severity`, `request_id` query parameters | 200 `{ "events":[Event], "cursor":123 }` |
| POST /diagnostics/events | `{ "events":[BrowserEvent] }`, 1–50 entries | 204, no body; 400 for invalid batches |

Status is `connected` when both stores are available, otherwise `degraded`. Database/logging values are `ready` or `unavailable`; metrics are null if event storage cannot be queried. Readiness checks the workspace database read-only. Uptime measures the current application instance. Metrics count retained backend `http.*` events in the last 900 seconds; errors have status >=400. Diagnostics requests are excluded. A degraded status still returns HTTP 200. Browser-side `checking` and `unreachable` states are UI states, not status endpoint values.

### Event reads and retention

`Event` fields are `seq` (integer cursor), `id`, `timestamp` (server receipt time in Unix seconds), `source`, `severity`, `operation`, `request_id`, nullable `status`, nullable `duration_ms`, and `outcome`. Reads return at most 200 events, ordered by ascending `seq`, strictly after the supplied cursor (default 0). Negative cursors clamp to 0; noninteger cursors return 400. Nonempty source, severity and request-ID filters are exact matches. The cursor is the last returned sequence, or the supplied cursor when no events match.

SQLite storage deduplicates event IDs, retains at most 10,000 events, and prunes entries older than 24 hours on writes. Reads exclude expired events even before pruning. Browser timestamps are not accepted: delayed deliveries receive a server receipt timestamp. Consequently, an outage trace is not an exact chronology of client execution.

### Browser event ingestion

Required fields: `id`, `request_id`, `operation`, `outcome`. Both identifiers must match `^[a-f0-9-]{32,36}$`; the browser generates UUIDs. Operations: `workspace.create`, `workspace.read`, `document.upload`, `api.other`, `app.failure`. Outcomes: `completed`, `http_error`, `network_error`, `timeout`, `invalid_response`, `uncaught`.

Optional fields: `status` (null or integer 100–599) and `duration_ms` (null or finite number 0–3,600,000). Other event fields are rejected. The whole batch is validated before recording. The server assigns source `frontend`, severity `info` for completion or `error` otherwise, and receipt time. Delivery is best effort: 204 acknowledges validation and attempted recording, not guaranteed durable storage. Repeated IDs do not create duplicate database rows.

### Correlation and failures

When diagnostics is enabled, all responses receive `X-Request-ID`. Incoming values matching the identifier pattern are preserved; missing/invalid values are replaced with generated IDs. Workspace errors and the diagnostics generic exception handler also include `request_id` in JSON. Other handlers, including explicit 413 and diagnostics validation errors, may omit it from the body; use the response header as the consistent correlation interface.

Backend request events use `http.<Flask endpoint>` (or `http.unmatched`), response status, elapsed milliseconds and severity `info`/`warning`/`error` for <400/400–499/>=500. Uploads emit `pdf.extract` with `started`, followed by a document status or `failed`. These currently surround the ingestion call, so duplicate uploads can also emit extraction events. Unexpected exceptions return a sanitized 500 without raw exception text. Diagnostics routes are excluded from request events to prevent telemetry loops.

No document contents, filenames, request/response bodies, credentials or raw browser exception messages are captured by the structured event pipeline. Event-write failures are suppressed so they do not fail claim operations. Event-read failures use the generic error response; status reports logging unavailability. Existing Flask development-server access output is separate from these structured events.

## Implemented claim workflow (September 26)

These routes supersede the corresponding design-only rows above. All IDs are opaque. The existing upload endpoint remains synchronous and returns the workspace snapshot. Processing consumes existing extracted pages; no model runs implicitly on reads or upload.

| Method / route | Request | Response |
|---|---|---|
| GET /provider-status | none | `{configured:boolean, model:string, live_validation:"not_measured"}`; never returns a key |
| POST /workspaces/{id}/process | `{expected_revision, document_ids:[...]}` | 202 Job; 503 with `PROVIDER_NOT_CONFIGURED` before enqueue when configuration is missing |
| GET /jobs/{job_id} | none | Job with workspace ID, revision, status, stage, safe error code, retryable flag and timestamps |
| GET /workspaces/{id}/claim | optional `revision` query | `{claim:Claim|null, revision:currentWorkspaceRevision, analysis_status, metadata, revisions:[...], draft_ids:[...], job:Job|null}` |
| GET /workspaces/{id}/evidence/{evidence_id} | optional `revision`, defaults to current workspace revision | Canonical EvidenceReference; 404 if absent at that revision |
| POST /workspaces/{id}/questions/{question_id}/answer | `{expected_revision, answer, supporting_document_ids:[]}` | Updated workspace with incremented revision; prior analysis/drafts become stale |
| POST /workspaces/{id}/action-plan | `{expected_revision}` | Canonical ActionPlan for current analyzed revision; 409 if stale or not analyzed |
| POST /workspaces/{id}/appeal-draft | `{expected_revision}` | 201 Draft from all current supported arguments; 422 if no supported argument exists |
| GET /workspaces/{id}/appeal-drafts/{draft_id} | none | Draft plus `stale` flag |
| PUT /workspaces/{id}/appeal-drafts/{draft_id} | `{expected_revision, expected_version, text}` | Updated Draft with incremented version and `user_edited:true`; 409 for stale versions/revisions |

Job fields: `job_id`, `workspace_id`, `revision`, `status`, `stage`, `error` (null or safe code), `retryable`, `created_at`, `updated_at` (Unix seconds). Statuses: queued, running, succeeded, failed, obsolete. Stages: queued, extracting, retrieving, analyzing, validating, complete, failed, interrupted, discarded. Results from changed workspace revisions are discarded, not made current. Startup marks interrupted queued/running jobs as retryable failures. Reads do not recover or restart jobs automatically.

Processing requires a nonempty unique list of workspace-owned readable documents and caps total extracted text at 180,000 characters. Fingerprints include revision, selected document IDs/hashes and pipeline configuration. Repeated queued/running/successful inputs return their existing Job. Failed inputs may be retried. A successful immutable claim snapshot cannot be overwritten at the same workspace revision, even with a different document subset.

Claim `analysis_status`: not_analyzed, stale, needs_information, ready_for_review. A historical read retains the current workspace revision in the envelope; the Claim contains its original revision. Metadata excludes the cached extraction object but includes document hashes, configuration/schema/prompt versions, provider attempt counts, elapsed time, mode and limitations. `mode=live_model` identifies the production extraction path, not a passed live accuracy benchmark. Test harnesses explicitly use `test_double`.

Supported questions: Q-location, Q-receipt, Q-payment. Answers are 1–2,000 characters. Receipt uses YYYY-MM-DD and cannot be in the future; a receipt before the notice does not produce a calculated deadline. Supporting document IDs must belong to the workspace. Saving an answer does not itself validate documentary corroboration. User reports remain distinct evidence; new documents require reanalysis. Question answers invalidate all dependent analysis/actions/drafts through the revision mismatch.

Draft fields: `draft_id`, `revision`, `version`, `text`, `evidence_ids`, `attachments` (document IDs), `unresolved_fields`, `user_edited`, `submitted:false`; reads also include `stale`. Edits are 1–50,000 characters. Text export is client-side and does not bundle attachments or validate edited prose. There is no submit/send endpoint. Argument selection, workspace deletion, open-ended ask/chat, and automatic external-review filing remain unimplemented.

Diagnostics Event gains nullable `job_id` and `stage` for backend processing events. Browser ingestion still uses its restricted metadata schema, with additional operation names claim.process, claim.read, claim.answer, claim.actions, claim.draft and job.read. Job polling generates observable request events; diagnostics polling remains excluded.
