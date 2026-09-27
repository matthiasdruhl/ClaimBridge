# Browser walkthrough and evaluation — September 26, 2026

The saved walkthrough now reaches a current appeal draft, with citations, clarification, revision history, editing, persistence and copy export verified. **File download and original-PDF rendering remain unverified in the Codex in-app browser.** A previous unexplained processing failure did not reproduce on retry; it is not proven fixed.

## Results

| Check                                        | Result                        | Evidence                                                                                                                     |
| -------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Original five PDF uploads                    | Pass                          | Five readable documents persisted at revision 6                                                                              |
| Initial live extraction                      | Pass                          | 33.537 seconds; one provider request, no repair                                                                              |
| Separate claim amounts and unknown liability | Pass                          | All 26 original critical-field gates passed                                                                                  |
| EOB citation drawer                          | Pass                          | E2 explicitly shows $4,200, unknown allowance and $0 paid                                                                    |
| Receipt answer and stale analysis            | Pass                          | Answer creates revision 7; actions disabled until regeneration                                                               |
| Deadline regeneration                        | Pass                          | 22 ms, no model call; 2026-09-01 → 2027-02-28, user-reported receipt                                                         |
| D06 upload                                   | Pass                          | Six documents persist; revision 8 invalidates earlier analysis                                                               |
| First D06 analysis attempt                   | Fail, cause unknown           | `PROCESSING_FAILED` after 32.56 seconds; no diagnostic trace was retained then                                               |
| D06 retry after restart                      | Pass                          | 39.518 seconds; one provider request, no repair                                                                              |
| D06 conclusion and sources                   | Pass                          | Possible processing error; actual ASC and facility network supported by L1/L3; submitted POS remains 11                      |
| Original PDF viewer                          | Blocked by browser            | Source link opened the correct URL/page; Codex blocked the built-in PDF extension; no bypass attempted                       |
| Action plan                                  | Pass with citation limitation | Actions remain suggested/not submitted; deadline citations now appear beside the due date                                    |
| Draft generation and edit/save               | Pass                          | Revision 8 draft retains conditional wording, unknown final liability and unfilled destination/signature                     |
| Copy draft                                   | Pass                          | Browser clipboard text exactly matched the edited text                                                                       |
| Reload/reopen draft                          | Pass                          | Edited text exactly matched after reload and selecting saved draft                                                           |
| Download text                                | Unverified                    | Event wait timed out; native click also produced no verified new file; the existing Downloads file predates this walkthrough |
| Historical revision                          | Pass                          | Revision 6 retains its initial missing-information conclusion and unknown deadline                                           |
| Stale draft controls                         | Pass                          | New synthetic payment answer at revision 9 disables old draft Save/Copy/Download and shows historical warning                |
| Current regeneration/draft                   | Pass                          | Revision 9 regenerates in 24 ms without model extraction; current draft generated; older edited draft preserved              |

Every saved walkthrough revision (6–9) passed the 26 applicable original critical-field gates. Deadline and conclusion-reference checks also passed. Both completed live extractions used prompt `claim-extraction-v9` / pipeline `bounded-analysis-v3`. This walkthrough is additional evidence to the earlier 12/12 live suite, not a replacement or a claim that all attempts succeeded.

## Source assessment

Assistant review confirmed the important claim story against the cited synthetic sources:

- EOB E2 supports the disputed $4,200 billed/member amount, $0 paid and unknown allowance. E5 supports the separate facility amounts ($12,000 billed, $6,000 allowed, $4,800 paid, $1,200 member). B2 is a separate statement snapshot, not an additional debt.
- Plan P1/P2 support plan scope and coverage on the August 12 service date. P7/P8 provide the network exclusion and linked facility exception. P4 supports the displayed plan benefit amounts, without establishing final liability.
- Encounter L1 specifically links the anesthesia to the actual ASC; L3 confirms facility/provider network status on the service date. Original submitted POS remains 11; the app does not claim a provider admitted fault or that a correction already occurred.
- The deadline uses the recorded receipt answer plus P13's calendar-day rule. Historical revision 6 retains an unknown deadline.
- The appeal draft asks for review/reprocessing if supported, preserves unresolved claim records/recognized amount/final adjudication, and remains NOT SUBMITTED. The later generated revision 9 draft does not silently copy user edits from the old draft.

This is **assistant source review**, not independent human review or a legal/clinical accuracy certification. Human-review fields remain pending. External summaries retain their previously recorded verification dates; they were not re-researched during this software walkthrough.

## Changes and checks during this resume

- Added a regression test for safe unexpected-error logging: job ID, exception class and code locations are retained, while the sensitive exception message is absent. Failed processing cannot create a successful claim snapshot.
- Fixed a UI omission: the action-plan due date now displays the underlying receipt and plan-rule citations. This uses existing validated data and requires no extraction/pipeline change or new paid suite.
- Backend: **32 tests pass**, Ruff passes. Frontend test, ESLint, type check and build pass. The final formatting adjustment is checked separately. The existing ~532 kB build warning is unchanged.
- Earlier in this walkthrough, all **19 deterministic preparation probes** passed. Those do not constitute live adversarial model testing.

## Remaining issues and suggested next work

1. **Reliability:** retain the first D06 failure in the record. The successful retry does not establish its cause. Safe logging is now active for any recurrence; do not spend credits repeatedly trying to force a failure without new evidence.
2. **Export/browser compatibility:** verify Download text and the original PDF in the intended presentation browser. Copy draft is verified. The source PDF block is specifically in Codex's embedded browser. The download observation does not establish whether the cause is the app or browser integration.
3. **Citation quality:** action instruction buttons still mostly cite the denial reason; specific records/balance instructions would be clearer with their own plan/bill citations. The deadline citation gap was fixed. Draft exports use internal source IDs without a filename/page legend; improving that mapping is worthwhile before external sharing.
4. **Acceptance:** independent human source review and timed submission rehearsal remain open. The full live adversarial mutation matrix and generic-chat comparison have not been run. Do not present deterministic negative tests as live prompt-injection resistance.

## Saved state

- Workspace: `b4d952544b304ef6b6e3f0167d3fb2ab`, current revision **9**, six synthetic documents.
- Current generated draft: `ddbad4c9c0d540628f05745bb3163af3`; edited historical revision 8 draft: `d50a1860304448c2a2d94ad58c5e244b`.
- Failed job: `3567fee9ef254671a25948369987d037`; successful D06 retry: `24e418e0b7a24ff1b6877f48fe50177b`.
- Local artifacts: `var/evaluations/browser-walkthrough-20260926/`: revisions 6–9, field checks, full job history, saved draft JSON and text copies. These text copies were written from persisted drafts for review; **they are not proof of a browser download**.
- Local app restarted successfully; supervisor session `7560`. Browser walkthrough tab: `3` in browser `1` (use fresh discovery if unavailable).
- Changes remain uncommitted; no push, deployment or submission performed. No recurring work scheduled.
