# ClaimBridge pre-hackathon preparation

An evidence-backed blueprint and synthetic demo, **not a finished application**. Prepared September 24, 2026. Research was completed before choosing/authoring the case; supplemental workflow research was added during final review. Every case document is synthetic.

## Start here

1. [Readiness and build order](READINESS.md)
2. [Verified research/source register](research/authoritative-sources.md) and [machine-readable sources](research/sources.json)
3. [Three candidates and selected scenario](research/real-world-scenarios.md)
4. [Case instructions](demo-case/README.md) and [golden analysis](demo-case/golden-analysis.md)
5. [Four-minute live demo](pitch/demo-script.md)
6. [Architecture](engineering/architecture.md), [API contracts](engineering/api-contracts.md) and [backlog](engineering/implementation-plan.md)
7. [Evaluation plan](evaluation/evaluation-plan.md) and [reproduce checks](experiments/README.md)

## Upload packet

Initial PDFs: [plan](demo-case/documents/01-plan.pdf), [EOB](demo-case/documents/02-eob.pdf), [denial](demo-case/documents/03-denial.pdf), [bill](demo-case/documents/04-provider-bill.pdf), [authorization](demo-case/documents/05-authorization.pdf).

Reveal only after clarification: [location/network confirmation](demo-case/documents/06-location-confirmation.pdf).

A $4,200 anesthesia bill, an office-classified claim, a separate surgical-center encounter and a plan exception create the central conflict. Added evidence supports review/reprocessing; the corrected liability remains unknown. Do not promise savings or coverage success.

## Package map

- `research/`: real examples, process, jurisdiction/source distinctions, competition, access limitations.
- `demo-case/`: PDFs, editable documents, provenance anchors, golden states and appeal draft.
- `schemas/`: claim, evidence, document and action-plan contracts.
- `engineering/`: implementation-ready architecture, retrieval, pipeline, safeguards, prompts, stack, API, backlog and risk findings.
- `product/`: scope, user flow and component specifications.
- `experiments/`: isolated reproducible primitives, results, PDF renders and environment record.
- `evaluation/`: field assertions, evaluator, adversarial cases and smoke results.
- `pitch/`: narrative, timed script and skeptical judge questions.
- `DECISIONS.md` and `TODO.md`: rationale and outstanding work.

## Evidence conventions

D01-D06 = fictional uploaded documents; R01-R16 = real external research; C01-C03 = organization/vendor self-description; T01-T04 = technical references. Explicit document statements are not automatically true. User reports, derivations, unknowns and conflicting facts have different statuses. External paraphrases are labeled and linked, never passed off as verbatim quotations.

**Validation result:** 19 preparation probes pass; 12 PDF pages reviewed; 45 evaluator assertions pass against golden fixtures. Live extraction/model accuracy remains to be measured. See READINESS.md for limits.
