# Isolated risk experiments

See experiments/results.json for actual counts and environment.json for package versions. These are preparation probes, not a full application or clinical evaluation.

| Experiment | Observed outcome | Practical implication |
|---|---|---|
| Six PDFs / 12 pages | Page counts and synthetic headers verified | Packet is usable for text-based upload demo |
| Every section anchor | Whitespace-normalized text matched rendered PDF extraction | Coarse citations can be grounded; geometry still requires implementation |
| EOB table | pdfplumber recovered billed/allowed/paid/member cells, including -- | Null handling works on this table only |
| Bill ledger | Initial regex failed across a PDF line break; normalization fixed it | Exact-space regex is fragile; retain raw text and explicit normalization |
| Separate facility math | Billed/adjustment/paid/member reconciliation passed | Do not conflate facility balance with anesthesia bill |
| Receipt deadline / missing amount | Null retained and plan date calculated from receipt | Deterministic code is appropriate |
| Structured payload validation | Positive fixtures accepted; wrong type/citation/deadline rejected | Schema helps, but valid JSON does not prove semantic accuracy |
| 500 distractor sections | Required network sections retrieved in top six for one query | Promising baseline; not a long-plan generalization benchmark |
| External source selection | Explicit source gate selected intended records | This is routing code, not a demonstrated web-research agent |
| Corrupt PDF / encrypted PDF | Rejected or flagged | UI must expose recoverable document errors |
| Rasterized denial | No extractable text | OCR is not solved; request a text PDF for P0 |
| Instruction injection | Extra executable-looking payload rejected by schema | Live LLM prompt-injection resilience remains untested |

## Still high risk

LLM extraction on unfamiliar EOB layouts; semantically wrong but valid citations; live API latency; recognition of legal scope; stale source rules; exact highlight geometry. No API key was used and no live model accuracy claim is made. The case is deliberately favorable, English and born-digital. Keep fixture replay visible and never describe it as a successful live extraction.

PDF pages were rendered with Poppler and all 12 were visually reviewed. Layout was readable, with no clipped text or overlapping elements. Contact sheets and individual page renders remain in experiments/rendered/ for audit.
