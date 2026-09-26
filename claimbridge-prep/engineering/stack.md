# Recommended stack

Choices are engineering judgments, not measured production guarantees. Official references T01-T04 were opened; versions below should be locked from the working environment once integration starts.

| Layer | Choice and why | More complex alternative and why defer |
|---|---|---|
| UI | React + TypeScript, ordinary CSS; explicit component state | Large design system/state framework adds setup before six-screen demo works |
| API | Flask (T01), one Python service; developer already knows it | Async framework/microservices unnecessary for sequential small jobs |
| PDF | pdfplumber for text, geometry and EOB tables (T02); pypdf for structural checks | Multimodal-only extraction hides provenance and raises cost/latency |
| OCR | Detect image-only pages; ask for text PDF in P0 | Full OCR pipeline deferred until scans are a supported requirement |
| Structured model use | One provider-neutral adapter, schema-validated extraction/analysis, one repair retry | Agent frameworks and tool autonomy expand failure surface |
| Search | SQLite FTS5 (T03), section references and scoped registry | Embeddings/vector DB only if measured retrieval misses justify them |
| Storage | SQLite JSON revisions plus hashed local PDF files | Managed database/object store not needed for local synthetic demo |
| Citations | Explicit evidence table, actual page/section and optional parser geometry | Do not depend on model-generated prose footnotes |
| Testing | Python unittest + jsonschema; deterministic oracle fixtures | LLM-only judges cannot validate money, missing values or citation IDs |
| Demo run | Local frontend/API; preloaded source summaries; visible replay option | Cloud deploy introduces secret and networking work; only do it if event needs it |

No paid model or deployment choice is made without availability/budget testing. The preparation does not invoke an LLM API. During the event, verify chosen provider documentation and account permissions, record exact model/version, test schema adherence and measure latency. Keep credentials in server environment, never frontend or git. Synthetic fixture replay is fallback only and must be disclosed.

For dependencies used by these preparation scripts see experiments/environment.json and requirements-prep.txt. These are not a promised production lockfile.
