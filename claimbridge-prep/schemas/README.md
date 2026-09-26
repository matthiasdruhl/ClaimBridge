# Contract guide

JSON Schema 2020-12. Money is USD integer cents; coinsurance uses basis points (2,000 = 20%). Local references resolve through a schema registry under https://claimbridge.example/schemas/. The example domain is an identifier, not a network dependency.

claim.schema.json includes Member, InsurancePlan, Provider, Service, EOB, Bill, Denial, Authorization, PolicyProvision, ClarificationQuestion and Conclusion objects. Every important domain field is a ClaimFact envelope. evidence.schema.json implements EvidenceReference and ExternalEvidence metadata. action-plan.schema.json includes ActionItem and AppealArgument. document.schema.json describes immutable upload metadata.

A fact's status distinguishes explicit document content, user statement, deterministic derivation, unknown, and conflicting evidence. 'Explicit' means the source states it, not that the statement has been independently proven. No numeric confidence is emitted: no calibrated confidence experiment exists. Unknown values stay null. Keep all contradictory source records instead of overwriting their text.

Schemas constrain shape; the semantic validator must additionally enforce:

- All evidence IDs and foreign keys resolve in the same workspace/revision.
- Unknown facts have null values and a reason; known facts have evidence. Derived facts have a derivation with inputs.
- Evidence page/section exists in the actual uploaded version; quoted spans match extracted text after documented whitespace normalization. Never generate geometry not returned by the parser.
- External evidence references an opened, scoped registry item; a verified paraphrase must never be rendered in quotation marks as an exact source excerpt.
- Deadline requires a source rule and receipt trigger. Case identity and service dates must match before joining.
- An appeal is a draft, not submitted. Action completion requires evidence of completion.
- A state change invalidates all dependent conclusions/action plans until regenerated; immutable revisions remain reviewable.

The golden fixtures use human-reviewed section-level anchors with null character offsets. This is honest coarse provenance. During implementation, the parser should add exact extracted spans; the probe demonstrates a PDF-text match, not automatic interpretation accuracy.
