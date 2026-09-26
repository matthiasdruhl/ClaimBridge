# Stage contracts and ownership

| Stage | Input -> output/schema | Owner | Failure mode | Validation |
|---|---|---|---|---|
| Upload | PDF bytes -> Document | Code | disguised file, oversize, duplicate, encryption | Signature/type, size/page caps, hash, explicit encrypted status |
| Classify | page text -> document kind | Rules then LLM fallback | EOB mistaken for bill | Header evidence; allow unknown; human correction |
| Extract | PDF -> page text/table cells/geometry | pdfplumber | scan, columns, merged table cells | Minimum text; page count; preview; never zero-fill blanks |
| Facts | page spans -> ClaimFact candidates | LLM structured JSON; narrow deterministic parsers | wrong IDs/dates, unsupported fields | JSON Schema; source span match; preserve conflicts |
| Normalize | candidates -> Claim revision | Code | merges separate claims, cents errors | IDs/date/provider join; integer money; null preservation |
| Conflicts | claim -> discrepancies/questions | Code predicates + bounded model explanation | silently picks one location | Retain both POS claim and actual-location evidence |
| Policy retrieval | facts -> provisions/evidence IDs | FTS + cross-reference expansion | only exclusion returned | P7/P8 pair; plan/year filter |
| External retrieval | plan/dispute -> scoped source IDs | Code registry filters | wrong state/program; stale guidance | Scope predicates and opened-source status |
| Analyze | facts + provisions + rules -> conclusions | LLM with explicit supported IDs | advocacy bias; unsupported guarantees | Each conclusion supported, conditioned or withheld |
| Clarify | gaps -> question objects -> answers | Code priority; LLM wording | repeated irrelevant questions | Materiality and dependency map; user answers labeled |
| Update | answers/upload -> new revision | Code then regeneration | stale answer after corrected document | Revision lock; invalidate dependencies; keep audit trail |
| Actions | valid conclusions -> ActionPlan | Template/code + LLM prose | deadline invented, correction replaces appeal | Date engine; parallel correction/appeal tasks |
| Appeal | current state -> editable draft | Template + LLM assembly | clinical fabrication or automatic sending | Attachment manifest; evidence references; human review |

## Analysis logic for the chosen case

1. Coverage active? Plan scope known? If unknown, ask and avoid unconditional external-rule claims.
2. Is denial a network/setting decision? Use the stated reason, not guessed clinical criteria.
3. Retrieve general exclusion AND facility exception.
4. Compare submitted POS with actual encounter evidence. An authorization proves proposed scope, not attendance.
5. If qualifying facility and participation supported, propose reprocessing and explain limits. Otherwise ask for evidence or explain why general exclusion may be correct.
6. Separate current billed balance from final legally collectible liability. Do not compute corrected liability without a recognized amount and valid accumulator inputs.
7. Confirm denial receipt before generating a calendar filing date. External review is blocked pending the appropriate stage/notice in the demo.

## Revision example

Revision 1: unknown actual anesthesia setting; Q-location and Q-receipt open; deadline null. Revision 2: D06 corroborates ASC and participation; receipt is user-reported; deadline derived February 28, 2027 under fictional plan convention; recognized amount still null. Submitted POS remains 11 because history must not be rewritten as if the original claim had been corrected.
