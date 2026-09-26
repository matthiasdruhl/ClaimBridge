# Golden analysis — SYN-C260812-A

SYNTHETIC / DEMONSTRATION DATA. As-of September 24, 2026. This is the manually reasoned evaluation oracle, not runtime input. Citation syntax Dxx:anchor identifies the document, page/section in document-pages.json; Rxx resolves to research/sources.json. Primary sources establish rules; synthetic documents establish fictional case facts.

## Claim summary

Avery received an anesthesia bill for $4,200 after August 12 knee arthroscopy. The EOB and initial denial treat anesthesia as a non-emergency out-of-network office service (D02:E1-E3, page 1; D03:N1, page 1). The plan generally excludes such services but has a protected-facility exception (D01:P7-P8, page 3). The related facility EOB and authorization name Juniper Bay Surgery Center (D02:E5, page 2; D05:A1, page 1). They suggest, but do not alone conclusively establish, that the anesthesia occurred there.

## Financial summary

| Item | Disputed anesthesia claim | Separate facility claim |
|---|---:|---:|
| Billed | $4,200 | $12,000 |
| Allowed | Unknown / not determined | $6,000 |
| Plan paid | $0 | $4,800 |
| Contractual adjustment shown | $0 | $6,000 |
| Member responsibility on EOB | $4,200 | $1,200 |
| Deductible applied | $0 | $0 |
| Coinsurance applied | $0 | $1,200 |
| Copay | $0 | $0 |

D02:E2/E5. Facility math: $6,000 × 20% = $1,200; $12,000 = $6,000 adjustment + $4,800 payment + $1,200 responsibility. Anesthesia is a denial balance, not $4,200 of deductible. The separate facility responsibility is not a credit toward this bill. D04:B2 shows $4,200 requested and no payments posted as of September 5; later payment history still needs confirmation.

D02:E4/E6 reports deductible used $1,000/$1,000 and out-of-pocket credits $2,400/$5,000. The $2,600 remaining maximum is not an anesthesia allowance. Do not add both EOB responsibility and the identical bill as two debts.

Corrected liability and plan payment are unknown. For an explicitly labeled illustration only, if the applicable recognized amount were $1,200, the deductible remained met and no other adjustments applied, 20% would be $240. No document supplies that $1,200 anesthesia base. Do not display it as the expected outcome or infer a $960 insurer payment: provider reimbursement may use a different amount (R02).

## Denial explanation

Stated reason: SYN-NET07, a fictional administrator code, citing general network exclusion. Submitted POS 11 and blank facility identifier led the administrator not to apply Section 8 (D03:N1). No evidence of medical-necessity denial, missing separate anesthesia authorization, fraud or exhausted appeals. The prior approval is relevant context, not the decisive proof.

## Relevant plan provisions

- D01:P1/P2, page 1: funding, ERISA, non-grandfathered status and active coverage.
- D01:P4, page 2: 20% applicable coinsurance after deductible; $1,000 deductible and $5,000 individual maximum.
- D01:P7/P8, page 3: general exclusion and protected-facility exception must be retrieved together.
- D01:P10, page 4: anesthesia associated with approved surgery requires no separate authorization in this fictional plan.
- D01:P13/P14/P15, page 5: appeal, records and federal review route. None of these terms should be generalized to other plans.

## Relevant external evidence

R02 supplies the plan-side non-emergency facility protection; R03 addresses provider billing and the anesthesia consent exception. R06 explains the location code distinction. R01 supports the group-health internal appeal and record-access route. R04 explicitly recognizes this category for federal external review; it does not establish that the present claim has exhausted internal review. These sources support an argument when the required case facts hold, not an adjudication by ClaimBridge.

## Potential inconsistencies

The anesthesia location (office, missing facility) conflicts with the related encounter evidence. Same date/member/service relationship supports linking, but does not eliminate possibilities such as a separate office service, miscoding, mismatched records or processing error. Current material cannot identify which party caused the discrepancy. A paid facility claim does not prove every related professional service was correctly submitted.

## Missing information and clarification questions

1. **Q-location:** Where did the anesthesia actually occur? Can you provide the encounter record? Material because the facility exception depends on the service setting. D06:L1/L3 later corroborates service setting and date-specific network status.
2. **Q-receipt:** When did you first receive the August 28 denial? Material for the internal deadline. Initial exact deadline = null; the letter date is not a receipt date.
3. **Q-payment:** Any payments or newer EOB/bill since September 5? Material for current balance and duplicate adjudication, not for coverage entitlement.
4. Ask provider/plan for submitted claim fields, facility notification and corrected adjudication; ask for the recognized amount and accumulator treatment. These remain open after the presenter answers.

Do not make 'Did you sign consent?' the gating question for anesthesiology. If a form is raised, inspect it, but R03 excludes that notice-and-consent exception for this service category.

## Analysis by stage

**Initial:** possible provider billing or insurer processing error; missing information. Location inconsistency warrants investigation and preservation of appeal rights. A protected-facility argument is conditional.

**After user assertion only:** user reports ASC setting. Keep corroboration status 'user_reported'; do not turn memory into verified documentary fact.

**After D06:** documented encounter and payer network confirmation provide strong support for applying Section 8 and requesting reprocessing under the applicable protections. Classification: likely processing/location dispute; responsibility for the error remains undetermined. Obtain actual submitted/corrected claim; final monetary result remains unknown.

**Counterfactual actual office service:** the general network exclusion may have been applied correctly; no automatic facility protection. **Counterfactual service differs from authorization:** possible authorization/coverage dispute. **Contradictory facility confirmation:** uncertain; escalate and preserve both versions. **Different coverage type:** stop this rule route until plan classification is established.

## Action plan

1. Preserve the denial, bill, plan and upload originals. Confirm receipt date and keep proof of any submission. With user-reported receipt September 1, D01's 180-day convention produces February 28, 2027; submit earlier. This is a calculated plan date based on an unverified user date. Do not assume a weekend extension or replace it with March 1. Bill payment request October 5 is separate.
2. Ask Seabright billing to compare submitted location/facility fields to D06 and submit an accurate correction if appropriate. Request an itemized ledger and a written temporary hold while review proceeds. No hold is assumed granted.
3. Ask Harborlight to review D01 Section 8, D02/D05/D06, supply the relevant claim records and reprocess if supported. Obtain written acknowledgment and a corrected EOB with recognized amount, cost-sharing and accumulators.
4. Prepare and submit a timely internal appeal through the actual verified plan instructions if the dispute remains; a billing correction does not substitute for preserving this deadline.
5. If unresolved after the required internal process, use the final notice to verify federal external-review eligibility and instructions. Appropriate EBSA or CMS assistance can address plan-rights or provider-protection issues respectively. Do not direct this fictional self-funded case to California CDI IMR or patient-provider uninsured dispute resolution by default.

## Appeal strategy

Lead with the location evidence and exception, not a bare assertion that approval guarantees payment. Argument: the denial's office classification appears inconsistent with the actual ASC encounter; review Section 8 and applicable facility protections. Attach the complete packet, identify each claim separately, request claim-file access and corrected accounting. Ask for an explanation if the exception is rejected. Do not assert that the provider has admitted an error, a waiver was signed, the recognized amount is known, or an appeal has already been won.

## Expected user-facing result

'Your $4,200 bill follows a network denial. The documents disagree about where anesthesia was provided. The added records support a surgical-center exception, so a billing review and timely appeal are reasonable next steps. The final amount you owe still needs to be determined.' Every clause must have accessible evidence or an explicit interpretation label.
