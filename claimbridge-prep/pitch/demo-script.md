# Four-minute live demonstration

Clock frozen at September 24, 2026. Start with the upload page, synthetic label visible, no precomputed claim conclusions on screen. Stage the five initial PDFs and keep D06 out of the initial upload. The implementation may use local verified source summaries; label them accurately.

| Time | Screen / presenter action | Story and expected behavior |
|---|---|---|
| 0:00-0:25 | Show anesthesia bill and upload plan, EOB, denial, bill, authorization | 'Avery had surgery and then received a separate $4,200 anesthesia bill. What should they do next?' |
| 0:25-0:55 | Actual processing status, then money summary | Show $4,200 billed, $0 paid, allowed amount not determined. 'This is a network denial, not a deductible charge.' |
| 0:55-1:35 | Open location conflict, click EOB/denial evidence | Submitted office code; authorization and separate facility EOB point to a surgery center. 'We have a discrepancy, not enough evidence to promise a refund.' |
| 1:35-2:05 | Click plan evidence | Section 7 general exclusion and Section 8 exception shown together; distinct source class badges. |
| 2:05-2:40 | Answer Q-location and upload D06 | 'Both happened at Juniper Bay Surgery Center. Here is the encounter confirmation and service-date network message.' Updated interpretation becomes stronger; original POS remains 11. |
| 2:40-3:05 | Open federal evidence; answer receipt/payment | Show R02 and R03 source URLs/locators; 'The relevant rule fits the documented setting.' Enter receipt September 1, no later payment. Deadline becomes February 28, 2027, visibly based on user report. |
| 3:05-3:40 | Action plan and appeal draft | Billing review, claim-file request, protect internal appeal deadline. Click a draft argument and its evidence. No send button. |
| 3:40-4:00 | Highlight remaining unknown and close | 'The final amount is still unknown. ClaimBridge has turned scattered records into an explained, evidence-backed next step.' |

## Rehearsal checks

Reset initial state; confirm D06 is absent; correct source titles/URLs; no $240 expected-outcome banner; no medical-necessity claim; no fabricated completion; separate facility bill not added to disputed balance. Demonstrate a question changing the analysis, not merely a chat answer appended to a transcript.

## Failure fallback

If extraction/model exceeds the timebox, say 'Switching to a prerecorded structured-case replay' and show that label persistently. Replay uses expected-initial/clarified fixtures and is not a claim of live AI performance. If a source cannot open, show the dated verified summary with cached label and unresolved refresh. Do not fake loading or hide a failed analysis.
