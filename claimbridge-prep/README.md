# ClaimBridge preparation archive

This directory contains the research, synthetic documents, schemas, evaluation fixtures, and presentation material used to build ClaimBridge. The running application is documented in the repository [README](../README.md).

All patient, provider, plan, claim, contact, and billing data in this package is fictional.

## Demo packet

Upload the initial five PDFs from [`demo-case/documents`](demo-case/documents): plan, EOB, denial, provider bill, and authorization. Add the location/network confirmation only after the clarification step.

The scenario centers on a $4,200 anesthesia claim submitted as an office service, a separate surgical-center encounter, and a plan exception. The added evidence supports review or reprocessing; corrected liability remains unknown. ClaimBridge does not promise savings, coverage, or appeal success.

## Package map

- `demo-case/`: synthetic PDFs, editable source text, provenance anchors, golden states, and appeal draft.
- `research/`: source register, scenario research, process boundaries, and documented access limitations.
- `schemas/`: canonical claim, evidence, document, and action-plan contracts.
- `engineering/`: architecture, retrieval, safeguards, prompts, API contracts, and the historical build plan.
- `product/`: product scope, user flow, and component specifications.
- `experiments/`: isolated reproducible primitives, PDF renders, and environment records.
- `evaluation/`: field assertions, evaluator, adversarial cases, and smoke results.
- `pitch/`: narrative, four-minute demo script, and judge questions.

## Evidence conventions

`D01`–`D06` identify fictional uploaded documents; `R01`–`R16` identify external research; `C01`–`C03` identify organization or vendor descriptions; and `T01`–`T04` identify technical references. Document statements are not automatically treated as true. User reports, derivations, unknowns, and conflicts retain distinct statuses. External paraphrases are labeled and linked rather than presented as quotations.

Preparation checks cover 19 probes, 12 visually reviewed PDF pages, and 45 golden-fixture assertions. The separate provider-backed application suite passed 12/12 automatic gates; see the current [validation report](../docs/live-validation.md) and [submission readiness](READINESS.md).
