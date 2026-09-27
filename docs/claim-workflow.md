# Local claim workflow

The application now connects uploaded PDFs to background extraction, validated claim snapshots, bounded analysis, clarifications, actions and editable draft text. It supports network/location and prior-authorization reasoning under the documented scope checks. It does not establish real-world accuracy, adjudicate claims or submit appeals.

## Configuration and running

Use Node 24 and Python 3.12. Install updated dependencies with `npm ci --ignore-scripts` and `make setup-api`. For one-command startup, put backend-only `CLAIMBRIDGE_API_KEY`, `CLAIMBRIDGE_API_BASE_URL` and `CLAIMBRIDGE_MODEL` in the root `.env`, then run `make dev`. The launcher loads only backend settings, preserves existing environment overrides, and stops both services with Ctrl+C. It never performs live evaluation automatically. For separate terminals, export backend-only `CLAIMBRIDGE_API_KEY`, `CLAIMBRIDGE_API_BASE_URL` and `CLAIMBRIDGE_MODEL` in the API terminal, then run `make dev-api`; run `make dev-web` separately. The base URL includes the version prefix and must use HTTPS. The standalone backend and direct Python evaluation commands do not automatically read `.env`; `make dev` and the Node evaluation launcher load it. No model ID is assumed, and no key belongs in a `VITE_*` variable. `CLAIMBRIDGE_DATA_DIR` optionally changes the local storage directory.

The adapter targets Chat Completions with JSON Schema response format. The configured Meta Contributor model has returned a valid live synthetic extraction. The adapter requests `low` reasoning effort by default (`CLAIMBRIDGE_REASONING_EFFORT` overrides it). A small structured-output probe passed in about four seconds; the final suite passed 12/12 automatic gates; see [measured results](live-validation.md). A missing configuration returns 503 before creating a job; no fixture replay is substituted. Each request has a 120-second timeout, one retry for network/429/5xx failures, and one correction attempt for invalid JSON/schema/evidence. Worst-case latency can exceed two minutes; the UI shows actual job stages.

## User flow

1. Create or restore a workspace, confirm synthetic documents, upload the initial five demo PDFs, and inspect originals.
2. Analyze documents. The UI polls persisted jobs and displays validated amounts separately per claim. Unknown amounts remain unknown; the bill snapshot is not added to the EOB as a second debt.
3. Inspect conclusions and their source text/page in the evidence drawer. External summaries are labeled paraphrases and show recorded access dates.
4. Save receipt, location or payment answers; upload corroborating documents where needed. Previous output is visibly stale until reanalysis. Receipt reports remain user-reported; structured location reports stay user-reported and conflicting reports block the stronger facility argument; payment statements do not silently change balances.
5. Reanalyze. When document hashes/configuration are unchanged, reuse validated extraction and rerun deterministic reasoning with the new answers. Adding D06 causes fresh extraction. Earlier snapshots remain reviewable.
6. View actions and generate a draft from current arguments. Save edits, copy or download plain text. Edited prose is not automatically validated. Attachments are listed by document ID; export does not bundle PDFs. Verify destination/signature placeholders before any real use. No sending endpoint exists.
7. Use New workspace for another run; earlier workspace data remains stored. The browser currently remembers only the most recently selected workspace; there is no workspace-list interface.

## Implementation and storage

`application/analyze.py` owns a single lazy-started daemon worker per application instance. Run one local API process without the Flask reloader. Jobs, immutable claim revisions, revision-specific evidence, answers and versioned drafts use additive tables in the existing workspace SQLite database. On startup, queued/running jobs from the previous process become retryable interrupted failures. No upload data is removed.

Processing fingerprints include workspace revision, selected document IDs/hashes, model/provider/prompt configuration, pipeline version and canonical schema hash. Queued/running/successful repeats return the same job. Failed jobs can retry. New results cannot overwrite a successful immutable snapshot at the same revision. Uploads/answers advance the workspace revision; obsolete jobs are discarded before saving. Actions/drafts require current successful analysis. Draft writes also require their current version.

## Explicit Demo Mode

Demo Mode is a presentation optimization for the checked-in synthetic network case, not a fallback analysis engine. The browser still uses the normal workspace creation, PDF upload, processing-job, immutable revision, evidence, action-plan and appeal-draft routes. It sends `demo_mode: true` only when the user enables the visible control.

The API accepts exactly two SHA-256 sets: PDFs 01–05 and PDFs 01–06 from `claimbridge-prep/demo-case/manifest.json`. Unknown, incomplete or modified packets are rejected with instructions to turn Demo Mode off. Filenames do not determine a match.

The checked-in `apps/api/src/claimbridge/demo_fixtures/synthetic-network-v1.json` was exported from the validated `original-1-5` and `original-1-6` rows in final live evaluation `02b1d7a12604432fba879a580395466c` on September 26, 2026. Those runs used Meta `muse-spark-1.3-contributor`, prompt `claim-extraction-v9`, and pipeline `bounded-analysis-v3`. `scripts/export_demo_fixture.py` records the reproducible export. Document UUIDs are replaced by hashes in the fixture.

At runtime ClaimBridge maps the saved evidence back to the current workspace only after the exact hash-set match, validates every restored source passage against the uploaded PDFs, and runs the existing deterministic retrieval, reasoning, claim validation and action-plan code before saving the revision. Demo Mode never invokes `ModelProvider.extract`. Metadata labels the result `retained_validated_demo` and names the source live run. Normal mode continues through the provider-backed extraction path.

Model output supplies extracted facts and numbered source-passage references, not final conclusions. The server splits labeled source sections (or retains complete unlabeled pages) and hydrates selected references with exact original text and page offsets. The model does not rewrite quotations. Code validates canonical shape, evidence-page membership, quote offsets, fact status, numeric-source presence and entity references. Plan retrieval uses temporary SQLite FTS5 over extracted plan evidence with section expansion and exclusion/exception retention. Scope-filtered external evidence is restricted to registry R01, and R02/R03 when the facility conditions are supported. There is no open-ended legal web agent.

Explanations and drafts are deterministic templates using validated inputs. This avoids a second unconstrained generation stage but limits supported reasoning. Lexical plan checks and model classification remain imperfect; human citation/applicability review is required. Current corrected liability is deliberately always unknown. Multiple adjudications for a single claim require review instead of automatic merging.

Diagnostics includes job IDs, stages, duration and provider/validation outcomes. Persisted result metadata records the selected configuration, document hashes, prompt version, elapsed time and provider attempt counts. It does not include API keys. Local stored claim/evidence records contain the synthetic source text; structured diagnostics does not.

## Verification and known limits

Run `make check`. Backend tests exercise real PDFs with explicitly test-only extraction candidates, not a live model. They cover the original before/after case, office case, authorization case, evidence fabrication, separate claims, unknown values, deadline prerequisites, idempotency, restart recovery, obsolete results, stale drafts, and bounded provider failures.

Use `node scripts/evaluate-live.mjs --probe` for a tiny provider check, then `node scripts/evaluate-live.mjs --smoke` for one initial packet. Run `node scripts/evaluate-live.mjs` for the full suite. These commands load backend settings from `.env` without executing it; existing environment variables take precedence. The direct Python command still requires exported settings. Run these only when credentials and credits are available. This makes paid model calls, repeats each scenario three times (original before and after D06), writes actual outputs and run metadata to ignored `var/evaluations/`, and applies outcome, identity and financial gates. Original cases also check plan scope, the documented setting and scoped external evidence; office/authorization packets have independent critical-field checks. Human citation review and the complete preparation evaluator remain additional release gates; this runner is not an accuracy certification. Live runs have begun; retained results distinguish successful validation from failed provider/citation attempts. See [the validation report](live-validation.md) for measured release status and remaining checks.

New independent packets are under `tests/fixtures/scenarios/office` and `tests/fixtures/scenarios/authorization` (three PDFs each). Expected extraction files are test oracles and never runtime inputs. `scripts/build_scenarios.py` reproduces PDFs with the preparation ReportLab environment. All six pages were rendered and visually reviewed.

`tests/e2e/serve_fixture.py` is an explicit browser test harness requiring the original packet, isolated temporary storage and a visible TEST DATA result label. It is not imported by production, enabled through environment credentials, or an automatic fallback. Browser checks covered upload, processing, evidence inspection, receipt clarification/reanalysis, draft editing/saving and the export control. Live-model browser rehearsal is still pending.

Remaining limits: synchronous initial PDF extraction; no OCR or exact visual highlights; no authentication or public deployment; no clinical/medical-necessity reasoning; no final liability calculation; no automated full-browser regression suite. Keep the local diagnostics disabled if deployment is later introduced. Reserve the final two hours before Sunday September 27 at 8 AM Eastern for actual-model testing, fixes and rehearsal rather than new categories.
