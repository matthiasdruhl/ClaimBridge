# Live validation — September 26–27, 2026

The final provider-backed synthetic suite passed **12/12 automatic gates**: three repetitions each of the initial network/location packet, the packet with location confirmation, an independent office packet, and an independent authorization packet.

These results measure the checked synthetic scenarios. They are not a certification of medical, legal, insurance, or production accuracy.

## Configuration

- Provider/model: Meta `muse-spark-1.3-contributor`
- Reasoning effort: `low`
- Prompt: `claim-extraction-v9`
- Pipeline: `bounded-analysis-v3`
- Schema hash: `e14727895caf69a51a9ac3681b979d15c094c73aa46176077cff2eeceeea3af9`
- Retained run ID: `02b1d7a12604432fba879a580395466c`

Credentials and raw run artifacts remain in ignored local files. No credential is stored in the repository.

## Provider-backed results

| Run               | Gate | Elapsed | HTTP attempts | Repairs |
| ----------------- | ---- | ------- | ------------- | ------- |
| original-1-5      | Pass | 42.32 s | 1             | 0       |
| original-1-6      | Pass | 44.05 s | 1             | 0       |
| original-2-5      | Pass | 43.59 s | 1             | 0       |
| original-2-6      | Pass | 35.75 s | 1             | 0       |
| original-3-5      | Pass | 44.16 s | 1             | 0       |
| original-3-6      | Pass | 38.34 s | 1             | 0       |
| office-1-3        | Pass | 25.98 s | 1             | 0       |
| office-2-3        | Pass | 39.10 s | 1             | 0       |
| office-3-3        | Pass | 36.24 s | 1             | 0       |
| authorization-1-3 | Pass | 29.78 s | 1             | 0       |
| authorization-2-3 | Pass | 38.09 s | 1             | 0       |
| authorization-3-3 | Pass | 66.82 s | 2             | 1       |

Median analysis time was **38.72 seconds**. Eleven runs passed on their first generation. The final authorization run returned a duplicate evidence ID; validation rejected it and the single permitted repair succeeded.

Earlier prompt versions failed the clarified original scenario and are not counted as final evidence. Those failures were retained rather than replaced.

## What the gates check

- claim and service identity;
- separate financial records without double counting;
- unknown values remaining unknown;
- submitted location remaining distinct from the documented encounter location;
- service-date plan scope and required facility evidence;
- authorization scope across service code, provider, and date;
- evidence IDs, pages, exact source restoration, and canonical schema validity;
- bounded outcomes rather than guaranteed payment or appeal success.

Automatic gates can detect known structural and scenario-specific failures. They cannot prove that every interpretation is correct.

## Deterministic workflow verification

The saved-extraction workflow check disables provider access and verifies receipt clarification, stale analysis and draft blocking, deterministic regeneration, draft generation/edit/save/reopen, and stale-version rejection.

For the synthetic receipt date `2026-09-01`, the plan's explicit 180-calendar-day rule produced `2027-02-28`. The receipt date remained labeled user-reported. Corrected liability remained unknown and no appeal was submitted.

The denial notice date and the date the member received the notice remain separate facts. The notice establishes August 28, 2026, but does not establish receipt. Similarly, an EOB showing no posted patient payment does not prove that the member personally made no payment.

## Browser verification

The saved walkthrough covered upload, analysis, evidence inspection, receipt-date clarification and regeneration, the D06 transition, revision history, stale controls, and draft editing and persistence.

On September 27, the presentation workflow was rechecked in normal Chrome:

- an EOB citation opened its exact source drawer;
- the original EOB opened in Chrome's PDF viewer with `#page=1`, and the viewer selected page 1 of 2;
- Copy appeal reached the confirmed `Copied` state;
- Download draft produced a new plain-text file;
- a saved current-revision draft reopened with the same text length and the `Saved draft loaded` state.

The earlier Codex in-app browser could not render Chrome's PDF extension and did not expose its download event reliably. That was an environment limitation; the same functions passed in normal Chrome.

## Current repository checks

`make check` covers 34 backend tests and 13 frontend tests, plus Ruff, ESLint, TypeScript, the production build, and formatting. The build reports a non-blocking JavaScript chunk-size warning; it is not a functional failure.

## Remaining limits

- Independent human review of every final provider-run citation is still pending.
- The browser workflow is manually verified; there is no automated full-browser regression suite.
- The evaluated inputs are synthetic, English, and born-digital.
- OCR, authentication, hosted deployment, clinical reasoning, and final liability calculation are outside the current scope.
- Exact quotations establish provenance, not correct applicability or interpretation.

See [`claim-workflow.md`](claim-workflow.md) for runtime boundaries and [`browser-walkthrough.md`](browser-walkthrough.md) for the historical development walkthrough.
