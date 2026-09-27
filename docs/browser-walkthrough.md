# Historical browser walkthrough — September 26, 2026

This is a development verification record, not the primary project overview. Current product behavior and measured results are documented in [`claim-workflow.md`](claim-workflow.md) and [`live-validation.md`](live-validation.md).

## Results

| Check                                        | Result               | Evidence                                                                                  |
| -------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Initial five PDF uploads                     | Pass                 | Five readable documents persisted                                                         |
| Initial live extraction                      | Pass                 | 33.537 seconds; one provider request, no repair                                           |
| Separate claim amounts and unknown liability | Pass                 | All 26 applicable original critical-field gates passed                                    |
| EOB citation drawer                          | Pass                 | Source passage showed $4,200 billed/member, unknown allowance, and $0 plan payment        |
| Receipt answer and stale analysis            | Pass                 | Answer created a new revision; actions stayed disabled until regeneration                 |
| Deadline regeneration                        | Pass                 | No provider call; `2026-09-01` produced `2027-02-28` as a user-reported receipt date      |
| D06 upload and reanalysis                    | Pass after one retry | First attempt returned `PROCESSING_FAILED`; the retry passed with one provider request    |
| D06 conclusion and sources                   | Pass                 | Actual ASC and service-date facility status were supported; submitted POS remained `11`   |
| Action plan                                  | Pass                 | Actions remained suggested/not submitted; deadline displayed its receipt and plan sources |
| Draft generation, edit, save, and reopen     | Pass                 | Current and historical drafts remained distinct                                           |
| Copy draft                                   | Pass                 | The UI reached its confirmed copied state                                                 |
| Revision history and stale controls          | Pass                 | Earlier results remained reviewable and stale draft actions were disabled                 |

All saved walkthrough revisions passed the applicable original critical-field gates. The completed live extractions used prompt `claim-extraction-v9` and pipeline `bounded-analysis-v3`.

The first D06 failure did not reproduce and its cause was not established. The successful retry should not be described as proof that the original failure was fixed.

## Source assessment

- The disputed EOB passage supports the $4,200 billed/member amount, unknown allowance, and $0 plan payment. The separate facility EOB is not added to the anesthesia debt.
- Plan sections support scope, service-date coverage, the network exclusion, and the linked facility exception without establishing final liability.
- The encounter record links the anesthesia service to the ASC and supports service-date network status. It does not establish who caused the submitted-location discrepancy.
- The deadline uses the user-reported receipt date and the plan's calendar-day rule. The notice date alone does not resolve the receipt question.
- The appeal draft remains conditional, preserves unresolved fields, and is labeled not submitted.

This was an assistant source review, not an independent legal, clinical, or benefits review.

## Later presentation-browser check

The original walkthrough ran inside the Codex embedded browser, which could not render Chrome's PDF extension and did not provide a reliable download event. A September 27 follow-up in normal Chrome verified both behaviors:

- a cited EOB opened the original PDF at page 1, and Chrome displayed page 1 of 2;
- Copy appeal reached the confirmed copied state;
- Download draft created a new plain-text file;
- a saved draft reopened successfully.
