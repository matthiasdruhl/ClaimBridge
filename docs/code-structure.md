# Repository and code structure

## Scope and status

The local app implements persistent synthetic-PDF workspaces, synchronous page-text extraction, original-document viewing, an opt-in diagnostics dashboard, provider-based extraction, bounded reasoning, retrieval, clarification, action plans and editable drafts. The final provider suite passed 12/12 automatic gates; see [the validation report](live-validation.md). Existing research and evaluation artifacts stay in place.

## Repository map

```text
Claimbridge/
├── apps/
│   ├── web/                          # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── app/                  # Application composition and workspace shell
│   │   │   ├── features/
│   │   │   │   ├── analysis/         # Claim, evidence, questions, actions and drafts
│   │   │   │   ├── diagnostics/      # Developer dashboard
│   │   │   │   ├── workspace/        # Workspace UI modules
│   │   │   │   ├── documents/        # Document UI modules
│   │   │   │   ├── evidence/         # Evidence UI modules
│   │   │   │   ├── clarifications/   # Clarification UI modules
│   │   │   │   └── appeals/          # Appeal UI modules
│   │   │   ├── components/ui/        # Shared presentational primitives
│   │   │   ├── lib/api/              # HTTP client and error boundary
│   │   │   ├── lib/contracts/        # Transport schema integration
│   │   │   ├── styles/               # Tokens and global styles
│   │   │   └── main.tsx
│   │   └── package.json
│   └── api/                          # Installable Python package
│       ├── src/claimbridge/
│       │   ├── __init__.py            # create_app composition root
│       │   ├── api/                  # Flask blueprints / HTTP boundary
│       │   ├── application/          # Use cases and narrow adapter interfaces
│       │   ├── domain/               # Pure facts/rules/validation/calculations
│       │   └── infrastructure/       # SQLite, PDF, LLM and retrieval adapters
│       ├── tests/                    # Backend tests
│       ├── pyproject.toml
│       └── requirements-dev.lock
├── contracts/                        # Canonical schema ownership / API guidance
├── docs/                             # Current code/contributor architecture
├── tests/frontend/                   # Node API-client behavior tests
├── tests/e2e/                        # Manual offline browser harness
├── scripts/                          # Launch, evaluation and fixture tooling
├── claimbridge-prep/                 # Research, schemas, synthetic assets, oracles
├── .github/workflows/ci.yml
├── .env.example
├── package.json                      # npm workspace commands
├── package-lock.json
├── Makefile
└── README.md
```

Directories containing only README files deliberately reserve ownership; they are not implemented features. Runtime data goes in ignored `var/`, outside source and public assets.

## Backend boundaries

```mermaid
flowchart LR
    HTTP[api: validate HTTP input] --> USE[application: coordinate use cases]
    USE --> DOMAIN[domain: pure rules and value objects]
    INFRA[infrastructure: concrete adapters] --> PORT[application: narrow interfaces]
    USE --> PORT
    ROOT[create_app: composition root] --> HTTP
    ROOT --> INFRA
```

The composition root constructs dependencies. Domain code never imports Flask, PDF parsers, databases or LLM SDKs. Application use cases consume passed-in adapters; do not fetch global Flask state there. Infrastructure implements those interfaces without deciding insurance coverage. Routes translate validated requests into calls and map results/errors to HTTP. Avoid decorators, abstract base classes or generic repositories until actual repeated behavior justifies them.

### Implemented modules

- `api/workspaces.py` currently owns workspace creation/reads, upload and original-content routes. `application/ingest.py` synchronously parses PDFs with pypdf; `infrastructure/workspaces.py` stores workspace snapshots and original blobs in `var/workspaces.sqlite3`. PDF parsing has not yet been separated into its planned adapter.
- `api/diagnostics.py` installs request-ID/timing hooks, sanitized generic errors, readiness/event routes and browser-event validation. `infrastructure/diagnostics.py` owns bounded event persistence and structured console emission. Upload routes emit correlated extraction events; domain logic does not depend on diagnostics.
- The composition root enables diagnostics only when application configuration or `CLAIMBRIDGE_DIAGNOSTICS=1` requests it. `make dev-api` sets the environment flag. Direct Flask starts default to disabled diagnostics.

### Claim workflow implementation

The composition root also constructs `AnalysisStore`, `ModelProvider`, and `AnalysisWorker`. Workflow HTTP routes live in `api/analysis.py`; canonical validation and bounded reasoning live in `domain/`; persisted jobs/revisions and provider/retrieval adapters live in `infrastructure/`. `features/analysis/ClaimWorkflow.tsx` presents the claim, evidence, questions, actions and draft. Browser contracts import canonical schemas into AJV. See [the workflow guide](claim-workflow.md) for exact data flow, configuration and remaining limitations.

### Target backend modules

The table describes intended ownership as the product grows; it is not an inventory of implemented files. In particular, uploads/content remain in `api/workspaces.py`, extraction is synchronous, while the claim-analysis worker and adapter are now implemented under the workflow modules described above.

| Location                    | Responsibility                                                 | Must not do                                                  |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| api/workspaces.py           | Workspace creation and revision-aware reads                    | Mutate documents while serving GET                           |
| api/documents.py            | Upload validation and secure file responses                    | Accept arbitrary filesystem paths                            |
| api/analysis.py             | Start processing, answer questions, report jobs                | Put prompts or calculations in routes                        |
| api/appeals.py              | Action plans and draft export                                  | Send or submit appeals                                       |
| api/errors.py               | Consistent error envelope and status mapping                   | Leak raw document text or secrets                            |
| application/ingest.py       | Store original, schedule extraction, record outcome            | Guess missing fields                                         |
| application/analyze.py      | Normalize -> retrieve -> reason -> validate -> persist         | Import golden answers                                        |
| application/clarify.py      | Add answer evidence, increment revision, invalidate dependents | Rewrite original submitted claim fields                      |
| application/appeal.py       | Assemble strategy/arguments/draft from supported conclusions   | Assert success or invent a signature                         |
| application/ports.py        | Small Protocols for repository, extractor, model and retrieval | Become a generic plugin framework                            |
| domain/models.py            | Validated internal claim/evidence value objects                | Duplicate transport schema constraints by hand unnecessarily |
| domain/finance.py           | Integer-cent calculations and reconciliation                   | Treat unknown allowance as zero                              |
| domain/deadlines.py         | Rule/trigger-based date calculations                           | Guess receipt date from notice date                          |
| domain/conflicts.py         | Explicit competing-fact detection                              | Pick convenient evidence silently                            |
| domain/validation.py        | Reference integrity, relationships and semantic invariants     | Treat valid JSON as proof of factual correctness             |
| infrastructure/sqlite.py    | Connections, transactions and repository implementation        | Global connection shared across workers                      |
| infrastructure/files.py     | Hashed immutable artifacts, safe ID-to-path resolution         | Load arbitrary files from request paths                      |
| infrastructure/pdf.py       | Page text/table/geometry extraction                            | Hide OCR failure by returning invented text                  |
| infrastructure/retrieval.py | Separate plan/external FTS queries and scope filters           | Mix state-law background into governing plan rules           |
| infrastructure/llm.py       | Provider SDK, timeout, structured response boundary            | Calculate balances or submit external actions                |
| infrastructure/prompts/     | Versioned extraction/analysis/draft templates                  | Include known golden results                                 |
| infrastructure/migrations/  | Ordered SQL changes once persistence exists                    | Silently reset user workspaces                               |

Single process and one sequential worker are sufficient initially. Transactions persist new revisions and invalidate dependent analysis together; enforce expected_revision at the repository boundary to handle concurrent requests. Jobs are idempotent on workspace/revision/input hash. Original documents and source statements remain immutable. Add UTC timestamps; keep medical service dates as calendar dates without timezone conversion.

## Frontend organization

Organize by user feature. A feature may contain `components/`, `hooks/`, `api.ts`, `types.ts` and colocated `*.test.tsx`, but create only what is used. `app/` composes features. Features export a small public API from `index.ts` once implemented. Other features must not import internal components. Share primitives only when actual reuse appears; avoid a catch-all utils directory.

Server owns claim facts, revisions, calculations and conclusions. Client owns navigation, selected evidence, expanded panels and unsaved form text. Keep local component state until cross-component needs justify a store. Do not add Redux or a router for one workspace by default. The shared API client treats response JSON as unknown and accepts a caller-supplied validator; the workspace currently validates canonical document objects and page entries. It reports network, timeout, HTTP and response-format failures. Use request cancellation and explicit loading/error states. React text rendering is the default; untrusted content must not be injected as HTML.

### Local diagnostics frontend

`main.tsx` selects `features/diagnostics/Dashboard.tsx` for `/diagnostics` and the workspace `App` otherwise, using full-page navigation without a router. `app/App.tsx` owns the upload shell and `features/analysis/ClaimWorkflow.tsx` presents analysis, evidence, clarification, actions, and drafts. Other feature directories reserve narrower future extraction points.

`lib/api/client.ts` attaches a UUID `X-Request-ID` to workspace API calls, applies a default 60-second timeout, validates responses and queues metadata-only outcomes. Startup telemetry also captures uncaught application errors using fixed descriptions. The in-memory queue holds at most 200 events, retries batches of 50 after backend recovery, and disappears on page navigation/reload. Diagnostics requests bypass the instrumented client to avoid feedback loops.

The dashboard polls readiness through the same `/api` proxy every five seconds and events every two seconds while visible. Health failures retain prior values with stale labels; a loaded dashboard remains usable during an API outage, but cannot be loaded when the frontend server is stopped. Manual health checks and event-feed pause/resume are available. Events are cursor-paginated and deduplicated in the browser (10,000 maximum). The UI filters the loaded history by source, severity and request-ID substring, shows the latest 300 matches, and traces a selected request using received events. Server filters instead use exact matches.

### Diagnostics storage and boundaries

`var/diagnostics.sqlite3` is separate from claim storage. Events retain up to 24 hours and 10,000 rows, with pruning on writes and expiration filtering on reads. Event timestamps reflect server receipt time, including queued browser events. Structured console records carry their own severity field; the current Python emitter uses the warning log level for all records. Event writes are best effort and must not interrupt claim processing. Logs exclude document text, filenames, credentials and bodies. Flask access output is separate.

The interface has no authentication and is intended for local development only. Keep diagnostics disabled on public deployments. It provides health checks and observation, not service start/stop controls. See [implemented API contracts](../claimbridge-prep/engineering/api-contracts.md#implemented-local-diagnostics-september-26) for wire fields and error behavior.

### Appeal reasoning is a first-class view

`features/appeals/` renders **Why this approach?** using the validated argument's evidence and limitations:

1. Stated denial reason and cited source.
2. Contrary or missing facts and their support.
3. Applicable plan provision and scoped external rule.
4. Requested remedy and why it addresses that denial.
5. Alternatives and unresolved conditions.

Do not label an approach 'best' without qualifying it as strongest supported by the current evidence. Support the location argument without pretending prior authorization guarantees payment. This is presentation of existing validated arguments, not a second browser-side reasoning engine. Before/after analysis and downloadable packets remain optional enhancements.

## Contracts and fixtures

**Single source of truth:** `claimbridge-prep/schemas/*.schema.json` remains canonical for now. Do not copy it into apps. Backend internal value objects may wrap validated DTOs, but do not independently evolve wire fields. Once generation is implemented, generated TypeScript files go in web/src/lib/contracts and CI checks regeneration produces no diff. OpenAPI transport envelopes will live under contracts; the prepared API spec guides the first implementation.

Keep these domains distinct:

| Data                                                   | Allowed readers                                   |
| ------------------------------------------------------ | ------------------------------------------------- |
| User PDFs, extracted text, claim state in var/         | Backend workspace services only                   |
| Explicitly selected verified external-source registry  | Backend scoped retrieval                          |
| Synthetic PDFs                                         | User-selected upload or explicitly labeled replay |
| golden-analysis.md, expected-*.json, golden-tests.json | Tests/evaluation; never live analyzer             |
| Browser public assets                                  | Non-sensitive static UI assets only               |

Never recursively ingest the preparation directory. Replay must be explicit and visibly labeled. Model keys stay backend-only; VITE-prefixed variables are public browser configuration. The root `.env` is ignored; `make dev` and the Node evaluation launcher load it without overriding existing environment variables.

## Tests and tooling

Backend uses pytest and Ruff. Frontend uses strict TypeScript, ESLint and Prettier. Python uses a src layout and editable install; Node uses one npm workspace lockfile. CI runs checks without model credentials or networked insurance calls. Add domain unit tests for money/date/conflict behavior, integration tests for repositories/API boundaries, and one full-flow browser test once those features exist. Don't write tests merely to assert that placeholders render.

Lockfiles freeze the verified dependency resolution; manifests express supported ranges. Update manifests and locks in the same change and rerun checks. requirements-dev.lock captures this scaffold's development environment; produce a separate deployment lock/image only when deployment is actually introduced. Flask/Vite development servers are local development tools.

## Official references checked

- [Flask application factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/): separate app instances and composition.
- [Python Packaging Guide: src layout](https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/): explicit installation and import isolation.
- [Vite guide](https://vite.dev/guide/): frontend development/build tooling.
- [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html): strict type checking.

These references inform the scaffold. Feature ownership and module choices are project decisions, not universal requirements.

## Local verification

`make check` runs the backend workflow and diagnostics tests, the Node frontend API-client behavior test, Ruff, ESLint, TypeScript, the Vite production build and formatting checks. Backend coverage includes actual synthetic PDF ingestion, persistence/deduplication, workspace isolation, diagnostics correlation, validation, retention and logging failure isolation. The client test covers success, network failures, timeouts, malformed JSON and non-JSON HTTP errors.

The diagnostics layout and API outage/recovery states were manually checked in the browser. The saved claim workflow and normal-Chrome presentation path were also manually verified. The live provider suite passed 12/12 automatic gates. An automated full-browser suite and hosted verification remain outstanding.

Dependency resolution deliberately keeps TypeScript 5.9 within the linter peer range. The npm lock captures the tested toolchain; do not bypass peer conflicts with force or legacy-peer-deps. The official [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node) and [setup-python](https://github.com/actions/setup-python) documentation informed the CI configuration.
