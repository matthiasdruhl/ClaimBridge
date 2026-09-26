> **Latest:** [browser walkthrough results](browser-walkthrough.md). D06 retry, draft persistence/copy, revision history and stale controls passed. The earlier generic failure remains unexplained; original-PDF rendering and file download remain browser acceptance gaps. Backend tests now total 32.

# Live validation — September 26, 2026

The post-key implementation is complete for local synthetic evaluation. The final runtime passed **12/12 live automatic gates**: three repetitions each of the original initial packet, original packet with location confirmation, independent office packet, and independent authorization packet. Final browser rehearsal and human citation review remain open.

## Configuration and retained evidence

- Provider: Meta, `muse-spark-1.3-contributor`, reasoning effort `low`.
- Prompt: `claim-extraction-v9`; pipeline: `bounded-analysis-v3`.
- Schema hash: `e14727895caf69a51a9ac3681b979d15c094c73aa46176077cff2eeceeea3af9`.
- Actual outputs, candidates and metadata: `var/evaluations/02b1d7a12604432fba879a580395466c/` (ignored local artifacts).
- API key stays in ignored backend `.env`. No credentials are recorded here.

## Live results

| Run               | Automatic gate | Elapsed | HTTP attempts | Repairs |
| ----------------- | -------------- | ------- | ------------- | ------- |
| original-1-5      | Pass           | 42.32 s | 1             | 0       |
| original-1-6      | Pass           | 44.05 s | 1             | 0       |
| original-2-5      | Pass           | 43.59 s | 1             | 0       |
| original-2-6      | Pass           | 35.75 s | 1             | 0       |
| original-3-5      | Pass           | 44.16 s | 1             | 0       |
| original-3-6      | Pass           | 38.34 s | 1             | 0       |
| office-1-3        | Pass           | 25.98 s | 1             | 0       |
| office-2-3        | Pass           | 39.10 s | 1             | 0       |
| office-3-3        | Pass           | 36.24 s | 1             | 0       |
| authorization-1-3 | Pass           | 29.78 s | 1             | 0       |
| authorization-2-3 | Pass           | 38.09 s | 1             | 0       |
| authorization-3-3 | Pass           | 66.82 s | 2             | 1       |

Median analysis time: **38.72 seconds**. Eleven analyses passed on their first generation. The final authorization run emitted a duplicate evidence ID; validation rejected it and the single permitted repair succeeded. This is measured synthetic repeatability, not a general accuracy guarantee.

## What changed

- The model selects immutable numbered source passages; the server restores exact document text, page and offsets. It no longer needs to transcribe quotations.
- Validation identifies money/citation errors precisely, rejects invalid facility references, preserves separate EOBs, and anchors the root claim ID to the source-backed denial.
- Extraction distinguishes submitted claim fields from the actual documented facility, and evaluates coverage on the service date.
- Provider handling records safe usage/timing metrics, allows a bounded repair and transient retry, and uses a 120-second request timeout.
- A safe `.env` launcher runs paid evaluations explicitly. Independent critical-field gates cover original, office and authorization packets.

Earlier v7 and v8 trials failed the clarified original scenario: first an omitted actual facility reference, then service-date coverage treated as unknown because the analysis date followed coverage expiration. Prompt/schema clarification fixed those issues before this full v9 suite. Retained failed runs: `a032fced4f1e490c9bd7987fcfe5993a` and `63414009c346461ab88ccdaf7c812bc5`. The earlier v6 partial run is historical, not final-version evidence.

## Workflow and source checks

`make check` passed: 31 backend tests, frontend telemetry test, Ruff, ESLint, TypeScript, production build and formatting. The build retains a non-blocking 532 kB JavaScript chunk warning. Evaluation scripts also pass Ruff.

`scripts/verify_live_workflow.py` used a consistent SQLite backup of the actual live results, with a provider that fails if called. All three clarified original workspaces passed receipt clarification, stale analysis/draft blocking, deterministic regeneration, draft generation/edit/save/reopen and stale-version rejection. Receipt `2026-09-01` produced `2027-02-28`, labeled user-reported. Regeneration took 13–14 ms with zero provider calls. Corrected liability stayed unknown; no appeal was submitted. See the local `workflow-verification.json` artifact.

Assistant source inspection checked the original scenario's key financial/setting/plan facts and representative office and authorization output against their cited passages. The office conclusion remains conditional; the matching authorization supports possible processing error, not guaranteed payment. Submitted POS stays distinct from actual setting. These checks do not replace human review: every run's `human_citation_review` remains `pending`. Some noncritical facts still vary conservatively (for example an explicit false or fictional code-system label may be left unknown).

## Remaining acceptance checks

1. The resumed browser flow now passes upload, analysis, citations, receipt regeneration, D06 retry, draft edit/save/copy/reload and stale-history controls. Original-PDF rendering and text-file download remain unverified in the embedded browser. See [the walkthrough report](browser-walkthrough.md), including the retained first-attempt D06 failure.
2. Have a person review critical citations/conclusions against the synthetic sources; leave review status pending until actually done.
3. Rehearse the four-minute demo using measured latency. Do not promise a 30-second live extraction. Clearly disclose any saved live result used for presentation.
4. Review and commit the working-tree changes when ready. No commit, push, hosted CI run or deployment was performed in this implementation session.

Hosting, OCR, more clinical categories and the optional evidence map remain outside this implementation scope. No additional paid evaluation or background automation is scheduled. Start the local app with `make dev`; evaluation commands and the no-network workflow check are documented in `scripts/README.md`.
