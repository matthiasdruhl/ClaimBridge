# Current implementation readiness — September 26

Solo build, local first. Deadline: Sunday, September 27, 2026 at 8 AM Eastern. Meta credits/configuration remain pending. Hackathon prepared-asset rules have not been supplied.

## Implemented and locally checked

- Persistent synthetic PDF upload, original viewing, page extraction and duplicate/revision checks.
- Local diagnostics with request/job correlation, bounded storage and outage/recovery display.
- Background processing with persisted jobs, restart failure recovery, immutable claim snapshots and obsolete-result rejection.
- Configurable provider adapter, canonical schema validation and exact-page quotation checks.
- Bounded network/location and authorization reasoning, plan FTS/cross-reference retrieval, scoped external summaries, clarification, receipt-rule date calculation, action plans and editable/exportable drafts.
- Original initial/clarified scenario and independent office/authorization packets pass tests using test-only extraction candidates. The new six PDF pages were rendered and visually reviewed.
- Browser test harness verified uploads, evidence drawer, receipt clarification/regeneration and draft editing/saving. The harness displays TEST DATA and uses isolated temporary storage.

## Still required before calling this demo-ready

- Configure actual provider/model and credits, verify supported JSON Schema subset, and run scripts/evaluate_live.py. No live model accuracy or latency result exists yet.
- Inspect every important fact/conclusion against its evidence; matching quotations do not establish entailment. Complete actual-output evaluation and rehearse the four-minute demonstration.
- Reserve the final two hours for fixes and rehearsal. Do not add hosting/OCR/clinical categories before the core gates pass.
- Confirm event rules and have a qualified reviewer assess any public real-world reuse. The implementation is synthetic/local only; no final liability or successful appeal is claimed.

See ../docs/claim-workflow.md and engineering/api-contracts.md for current behavior and limitations. The historical preparation results below do not measure live model performance.

---

# Historical preparation readiness

## Complete

Research register with **23 opened primary-source pages** (16 insurance/privacy sources, three organization/product pages and four technical references); real overturned/upheld case examples with scope caveats; three compared demo candidates; six synthetic PDFs totaling 12 pages plus editable text; manually reasoned golden analysis; initial/clarified/action fixtures; four JSON Schemas; provenance, pipeline, retrieval, safeguards and prompts; UI/API/architecture specs; prioritized backlog; risk probes; evaluation data and runner; four-minute demo, pitch and judge answers.

**Verified:** applicable federal facility/anesthesia protections, provider consent exception, ERISA group-health appeal provisions and federal external-review category against opened regulations; government guidance and state-review example against opened official pages. The exact fictional case is not a reported real dispute. Source URLs, scope, locators, access dates and unknown effective dates are retained. Failed accesses are documented separately.

**Checks:** 19 isolated tests pass. All 12 PDF pages rendered and visually reviewed. Evaluator smoke checks pass 22/22 initial and 23/23 clarified assertions. These are preparation/fixture results, not measured live LLM or end-to-end application accuracy.

## Unresolved assumptions

Event permits prepared assets; two developers and one focused build day; synthetic-only English text PDFs; local demo. Professional review of the abbreviated synthetic plan/denial remains advisable before public reuse. No complete source snapshots, comprehensive 50-state survey, commercial dual-coverage rules engine or production privacy determination. Receipt date is user-reported; corrected liability remains unknown intentionally.

## Highest technical risks

Semantically incorrect but structurally valid extraction; wrong evidence applicability; unfamiliar EOB layouts; scan/OCR handling; model latency and schema support. Isolated tests do not solve these. Full UI/API integration and exact document highlights are still to build.

## Highest demo risks

Accidentally uploading reveal D06 initially; presenting a hypothetical $240 liability as fact; implying a proven coding culprit, completed appeal or savings; merging the facility claim into anesthesia debt; source outage; silent fixture replay. The script and acceptance gates explicitly check these.

## Historical work reservation (now superseded above)

Build frontend, backend endpoints/storage/jobs, live model adapter, runtime extraction/retrieval/reasoning, interactive clarification and evidence viewer, action/draft workflow, and actual-model evaluations. Deployment is optional after the local flow works. No finished application was quietly implemented.

## Recommended build order

1. Freeze schemas/API and fixture boundaries.
2. Upload -> PDF extraction -> validated fact state.
3. Deterministic finance/date/provenance checks.
4. Policy retrieval and jurisdiction-filtered external registry.
5. Conditional claim analysis.
6. Clarification and revision invalidation.
7. Evidence drawer, action plan and draft editor.
8. Actual-output positive/negative evaluations.
9. Timed rehearsal and transparent failure fallback.
10. Polish or deploy only after the core demonstration passes.

Detailed tasks, owners/dependencies and fallbacks: engineering/implementation-plan.md. Open issues: TODO.md.

## Repository structure update

At the user's request, a minimal React/TypeScript and Flask development scaffold now exists in apps/, with dependency locks, local commands, lint/type/build gates and a CI workflow. It adds no claim workflow or live model integration. See [code structure](../docs/code-structure.md). Hosted CI and the full product flow remain untested.
