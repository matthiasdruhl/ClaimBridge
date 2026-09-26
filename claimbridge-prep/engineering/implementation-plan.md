# Build backlog

Estimates assume two developers for one focused day; timeboxes are planning assumptions. Critical path: contracts -> PDF spans -> facts -> deterministic checks -> retrieval -> analysis -> clarification -> citations/actions -> rehearsal.

| Priority / task | Dependencies | Difficulty / timebox | Failure mode | Simplest fallback |
|---|---|---|---|---|
| P0 workspace/storage/upload | schemas | Low / 45m | path errors, duplicates | local fixture picker with disclosed source |
| P0 PDF pages and tables | upload | Medium / 60m | table/null corruption | text view and editable fact confirmation |
| P0 structured extraction adapter | parser | High / 90m | schema valid but wrong facts | needs_review; explicitly labeled fixture replay |
| P0 normalization/provenance | schemas/parser | Medium / 60m | merged claims, missing anchors | section citations instead of exact highlights |
| P0 money/date/semantic validation | facts | Medium / 45m | unknown becomes zero | withhold uncertain amount/date |
| P0 plan + external retrieval | evidence | Medium / 45m | exclusion without exception | cross-reference expansion and curated registry |
| P0 conditional analysis | state/retrieval | High / 75m | confident unsupported advice | bounded templates backed by validated predicates |
| P0 clarification/revision update | analysis | Medium / 60m | stale action plan | invalidate and regenerate all analysis |
| P0 workspace UI/evidence drawer | API contracts, can start on fixtures | Medium / 90m | hidden evidence, clutter | text-first evidence drawer |
| P0 action plan/appeal draft | validated analysis | Medium / 45m | appears submitted | draft watermark and copy only |
| P0 acceptance run/rehearsal | all P0 | Medium / 60m | deadline, amounts, citations wrong | show partial result honestly; visible replay if needed |
| P1 “Why this appeal?” evidence map | validated arguments/citations, clarification revisions, evidence drawer | Medium / 2–3h timebox (estimate) | clutter or unsupported/stale links imply certainty | existing cited text explanation |
| P1 exact PDF highlights | extraction geometry/viewer | Medium / 45m | wrong coordinates | page + section selection |
| P1 extraction correction UI | fact editor/revisions | Medium / 60m | correction loses original | preserve old value/source in prior revision |
| P1 source refresh/cache | source registry | Medium / 45m | network/downstream scope changes | dated verified summaries |
| P1 keyboard/mobile polish | UI | Low / 30m | focus lost in drawer | accessible tabs |
| P1 failure-mode fixtures | validator | Medium / 45m | prompts leak oracle answers | separate test-only directory and runtime allowlist |
| P2 OCR, embeddings, extra claim variants | benchmark failures first | Deferred | adds latency | document requirements |
| P3 production privacy/security, multi-state rules, insurer integrations, business discovery | qualified reviews and pilot design | Separate project | inaccurate scope/compliance claims | no real-patient launch |

## Teammate separation

Frontend teammate can build components against expected JSON while backend teammate builds extraction/validation. One teammate owns schema/API changes to avoid drift. Clinical/legal reviewer can inspect case and sources independently without writing the application. These are team assignments for the hackathon, not subagents launched during preparation.

## Exact build order

1. Agree schema/API versions and fixture/replay labels.
2. Implement upload/storage and page text extraction; run artifact probes.
3. Add model adapter and measure extraction against golden fields.
4. Add semantic validators and deterministic money/date functions.
5. Add plan retrieval and scoped external registry.
6. Produce validated analysis with initial uncertainty.
7. Wire clarification and new revisions; verify D06 changes only justified conclusions.
8. Finish evidence drawer, actions and appeal editor.
9. Run positive/negative evaluation against actual candidate outputs.
10. Rehearse four-minute story and timeout/reset fallback; only then polish.

Full UI, live LLM integration, endpoints, deployment and submission integrations must wait for the hackathon. The isolated preparation scripts are intentionally not a finished app.

## Optional evidence-map enhancement

After core citations and clarification work reliably, visualize the small case-specific evidence graph using five or six cards and labeled connections. The map explains existing validated reasoning; it adds no new inference capability. Keep it outside the critical path and stop at the timebox if it threatens rehearsal. See product/ui-spec.md for acceptance criteria. A broad insurance ontology, automatic relationship discovery and dedicated graph database remain outside MVP scope.
