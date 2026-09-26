# Real disputes and scenario selection

Research preceded synthetic authoring. Source IDs resolve in sources.json and authoritative-sources.md.

## Evidence actually found

- **Actual case, R10:** New York 202303-160178 was overturned on clinical evidence. It is Medicaid, not a commercial surprise-bill precedent.
- **Actual case, R11:** New York 202406-179447 was upheld. Only the case metadata was accessible; its rationale remains unknown.
- **Regulatory example, R04:** Examples 4 and 7 explicitly describe anesthesia network/cost-sharing disputes. These are illustrative regulatory hypotheticals, not actual patient case reports.
- **Verified pattern, R05/R13:** Government and insurer material recognizes network billing and pre-/post-service coverage disputes. No prevalence estimate is inferred from these pages.

## Three candidates

| Candidate | Demo strength | Complexity | Evidence | Risks |
|---|---|---|---|---|
| A. Approved MRI, denied for missing authorization | Match authorization, date, service and provider across documents | Low-medium | Insurer workflow R13; plan terms would be synthetic | Approval may cover another site/service; administrative error is invented, not an observed case here |
| B. Medical-necessity denial with missing clinical record | Demonstrates clinician evidence and uncertainty | High | Actual overturned and upheld decisions R10/R11; review rights R01/R09 | Hard to explain in four minutes; requires genuine clinical expertise; unsafe to imply necessity |
| C. Anesthesia bill with conflicting facility location | Clear dollar stake; plan exception, service code and federal source; meaningful clarification | Medium | Explicit federal examples R04; R02/R03/R06 | Must establish actual facility, network status and covered service; cannot promise a dollar outcome |

**Select C.** The exact patient, amounts, documents and location mismatch are fictional. Representativeness means the dispute class is officially documented, not that its frequency or exact error mechanism was measured. The product should explain a discrepancy and preserve rights before accusing anyone.

## Pattern map for future triage

| Issue | Evidence to obtain | First branch | Limit |
|---|---|---|---|
| Medical necessity | Denial criterion, clinical notes, treating clinician response | Clinical appeal | Model does not decide necessity |
| Prior authorization | Approved service/site/date/units and actual submitted claim | Match scope, then correct or appeal | Approval alone is not the complete benefit decision |
| Coding/billing | Itemized bill, submitted claim fields, actual service record | Provider review/corrected claim | Never instruct an unsupported recoding |
| Network dispute | Provider and facility status on service date | Plan exceptions and applicable protection | Provider and facility networks differ |
| Patient responsibility | EOB, bill, adjustments, payments | Reconcile, then query discrepancy | EOB may itself be wrong |
| Deductible/coinsurance | Benefit schedule, accumulator timing | Recalculate applicable cost sharing | Do not apply percentage to billed charges by default |
| Excluded service | Exact exclusion and any exception | Contract interpretation | External review eligibility is not universal (R09) |
| Filing error | Received date, filing provision, denial reason | Ask submitting provider to investigate | No universal claim-filing deadline asserted |
| Coordination of benefits | Other coverage, effective dates, payer correspondence | Establish payer order under actual plans | Do not assume Medicare rules govern all dual coverage |

Last three rows are triage design, not independently verified universal legal rules. DOL coordination-of-benefits FAQ could not be opened; see TODO.

Additional verified background: R15 documents insurer coding/reprocessing disputes on the provider side; do not confuse those deadlines with member appeals. R16 documents Medicare coordination, explicitly outside the primary case. These support real workflow patterns without establishing a commercial payer-order rule.
