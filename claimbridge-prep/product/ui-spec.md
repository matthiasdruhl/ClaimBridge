# Claim Workspace UI specification

Desktop target 1440×900. Header: ClaimBridge, synthetic badge, claim ID, analysis revision and Reset. Three columns: documents 240px, analysis flexible (minimum 520px), evidence/questions 360px. On narrow screens collapse documents to drawer and use tabs for overview/evidence/questions. Font 15-16px body; readable tables, generous spacing, visible keyboard focus. Color never conveys status alone.

```text
ClaimBridge | SYNTHETIC DEMO | SYN-C260812-A | Revision 1
Documents           Claim overview                       Evidence / Questions
Plan · 5 pages      $4,200 billed | $0 paid               Where was anesthesia?
EOB · 2 pages       Allowed: not determined              [ASC] [Office] [Unsure]
Denial · 1 page     Location conflict [Why?]             Attach confirmation
Bill · 1 page       Submitted office / scheduled ASC     Receipt date [date]
Approval · 1 page   What happened                         Source drawer
+ Add document      Steps: review, records, appeal        Plan / Federal badges
                    [Review appeal draft]
```

## Component contracts

| Component | Data | Behavior and empty/error state |
|---|---|---|
| UploadCard | Document | Accessible drop zone + file picker; duplicate hash reuses upload; unsupported/encrypted explains next action |
| ProcessingStepper | Job stage/status | Poll job; persistent error details; retry safe stage only |
| MoneySummary | EOB financial + Bill | Billed, paid, adjudicated responsibility, requested bill balance separately; null = 'Not determined'; never green savings from a hypothesis |
| RelatedClaimPanel | second EOB | Collapsed by default, clearly different claim ID; no aggregation into anesthesia debt |
| ClaimExplanation | Conclusion[] | Fact/interpretation/conditional labels; sentence-level evidence button |
| ConflictCard | competing facts | Side-by-side value, document page, context; no automatic overwrite |
| EvidenceDrawer | EvidenceReference | Domain badge, title, page/section, selected span, source URL/date if external; paraphrases labeled; keyboard close and focus return |
| DocumentViewer | immutable PDF + anchor | Native PDF/page image plus text fallback; open at page; exact highlight only when geometry exists |
| QuestionCard | ClarificationQuestion | Explain why asked; allow unknown, free text and upload; receipt date preview; no forced answer |
| ActionChecklist | ActionPlan | Owner, next step, dependencies, due date origin; default suggested/draft; completion asks for evidence |
| AppealEditor | draft + attachments | Editable text; unresolved facts banner; copy/download; disabled submit absent by design |
| InsufficientEvidence | missing fields | List specific missing facts and effect; keep already verified facts visible |

## Copy and order

First insight is the conflict, not a federal acronym. After D06: 'Added records support asking for reprocessing.' Secondary line: 'The plan still needs to determine the corrected amount.' A receipt-derived date is labeled 'Based on your receipt date; submit early'. Bill due date and appeal deadline occupy separate rows.

External citations show 'Federal regulation' or 'Government guidance'; fictional SPD shows 'Your plan · synthetic'. Do not display extraction confidence percentages. Implement screen-reader labels and keyboard navigation for every evidence button. The evidence panel should never scroll the main claim overview out of view.

## P1: “Why this appeal?” evidence map

An optional compact card-and-arrow view helps users and judges inspect the recommendation. Keep the plain-language explanation and next steps primary. Show one path with five or six cards:

**Denial reason → conflicting evidence → plan exception / applicable external rule → appeal argument → requested action**

Use explicit relationship labels: **supports**, **contradicts**, and **needs confirmation**. Card ordering communicates the explanation sequence; arrows must not imply that contradictory evidence supports the denial. Each substantive link must resolve to existing evidence IDs and a validated argument or condition. Do not generate extra relationships merely to fill the visualization.

For the golden case, connect the office-classified denial, encounter/location evidence, facility exception, supported reprocessing argument and requested review. Keep corrected patient responsibility visibly unknown. Before D06, actual anesthesia location needs confirmation; after D06, update the affected support and show what changed without rewriting the original submitted POS.

### Acceptance criteria

- Every factual or rule card opens its source in the existing evidence drawer, including page/section or external locator.
- Unresolved conditions remain explicit; no amount or favorable outcome is invented.
- The map uses the same claim revision and arguments as the text explanation. Invalidate it when clarification changes the state.
- Users can inspect the same information as a keyboard-accessible ordered list on narrow screens or with assistive technology. Labels supplement color.
- A presenter can explain the path quickly without panning, zooming or dragging nodes.
- Implement with ordinary components and simple connectors; keep the layout fixed for the initial case.

Expected benefit is a product hypothesis: clearer evidence verification and a stronger demonstration of cross-document reasoning. This is not a measured usability result. Avoid a large freely arranged network. Store relationships in existing JSON/SQLite records; no graph database is needed for this view.
