"""Author independent synthetic PDF packets and test-only expected extraction candidates.

Uses ReportLab from the preparation environment. Never imported by the application.
"""
import copy
import hashlib
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "claimbridge-prep/schemas/claim.schema.json").read_text())


def empty(schema):
    if "properties" in schema:
        if "derivation" in schema["properties"]:
            return {"value": None, "status": "unknown", "evidence_ids": [],
                    "reason": "Not stated in the packet", "derivation": None}
        return {key: empty(value) for key, value in schema["properties"].items()}
    if schema.get("type") == "array":
        return []
    if "enum" in schema:
        return schema["enum"][0]
    return ""


def fact(value, reference):
    return dict(value=value, status="explicit", evidence_ids=[reference], reason=None, derivation=None)


def build(category):
    office = category == "office"
    folder = ROOT / "tests/fixtures/scenarios" / category
    folder.mkdir(parents=True, exist_ok=True)
    person, member = ("Morgan Vale", "SYN-OFF-M01") if office else ("Jordan Reed", "SYN-AUTH-M02")
    claim_id = "SYN-OFF-101" if office else "SYN-AUTH-202"
    provider_id = "SYN-OFF-P1" if office else "SYN-IMG-P2"
    code = "SYN-CONSULT" if office else "SYN-MRI-KNEE"
    service = "Office consultation" if office else "Knee MRI"
    charge = 65000 if office else 180000
    plan_id = "SYN-CEDAR-2026"
    plan = (f"Member {person}, member ID {member}, has active coverage for September 2026 under "
            f"plan {plan_id}. This employer group health plan is self-funded, ERISA-governed and "
            "non-grandfathered. This is a synthetic training plan, not an actual benefit contract.")
    network = ("Section 7: Non-emergency out-of-network office services are excluded unless an "
               "exception applies. Section 8: Covered non-emergency anesthesiology from a "
               "nonparticipating provider at a participating hospital or ambulatory surgical center "
               "uses protected in-network cost sharing. An ordinary office is not such a facility.")
    auth_rule = ("Section 10: Knee MRI requires prior authorization for the rendering provider, "
                 "service code and date range listed on the approval. Approval is not a guarantee "
                 "of payment; active coverage and other benefit conditions still apply.")
    appeal = ("Section 13: One internal appeal is available. File within 180 calendar days after "
              "receipt of the denial. For this synthetic plan, exclude receipt day and add 180 days. "
              "Request the claim file and verify the actual intake instructions. No real destination "
              "is provided. A bill's payment request date is not the appeal deadline.")
    claim_text = (f"Member {person}, {member}. Claim {claim_id}. Service {service}, code {code} "
                  f"(fictional internal code), September 10, 2026. Rendering provider {provider_id}, "
                  f"{'Willow Office Clinic, nonparticipating' if office else 'Harbor Imaging, participating'}. "
                  f"Submitted place of service {'11' if office else '22'}. "
                  f"Billed ${charge / 100:,.2f}; allowed amount not determined; paid $0.00; "
                  f"member responsibility ${charge / 100:,.2f}; adjustment $0.00. "
                  "Deductible, copayment and coinsurance each $0.00 on this denied claim.")
    denial = (f"Initial adverse determination dated September 18, 2026 for claim {claim_id}. "
              + ("Reason SYN-NET-O: Non-emergency out-of-network office service excluded under "
                 "Section 7. This is a network denial, not a medical-necessity determination."
                 if office else "Reason SYN-AUTH-MISSING: No prior authorization matched to the "
                 "submitted MRI claim under Section 10. This is an authorization denial, not a "
                 "medical-necessity determination.")
              + " Date actually received by the member is not recorded. This is not a final internal appeal decision.")
    encounter = (f"Encounter confirmation for {person}, {member}, claim {claim_id}: the consultation "
                 f"on September 10, 2026 occurred in an ordinary office operated by {provider_id}. "
                 "No hospital or ambulatory surgical center was involved and no anesthesia was "
                 "performed. This record does not establish another benefit exception.")
    authorization = (f"Approval SYN-APPROVAL-202 for {person}, {member}: one Knee MRI, fictional "
                     f"service code {code}, rendering provider {provider_id}, valid September 1 "
                     "through September 30, 2026. The approved service and provider match the "
                     "September 10 encounter. Approval does not establish final payment. No revised "
                     "EOB or final liability is available.")
    docs = [dict(id="D1", title="Synthetic plan excerpt", kind="policy", sections=[plan, network, auth_rule, appeal]),
            dict(id="D2", title="Synthetic EOB and denial", kind="eob", sections=[claim_text, denial]),
            dict(id="D3", title="Synthetic encounter confirmation" if office else "Synthetic authorization",
                 kind="correspondence" if office else "authorization", sections=[encounter if office else authorization])]
    claim = empty(SCHEMA)
    claim.update(id=claim_id, revision=1, as_of="2026-09-26", synthetic=True)
    claim["patient"].update(name=fact(person,"D1:E1"), member_id=fact(member,"D1:E1"))
    for key, val in dict(id=plan_id, funding="self_funded", erisa=True, grandfathered=False,
                         coverage_active=True, year=2026).items():
        claim["plan"][key] = fact(val,"D1:E1")
    for key,val in dict(appeal_days=180,appeal_trigger="receipt_calendar_days",appeal_levels=1).items():
        claim["plan"][key]=fact(val,"D1:E4")
    provider=empty(SCHEMA["properties"]["providers"]["items"])
    provider.update(id=provider_id,role="other",name=fact("Willow Office Clinic" if office else "Harbor Imaging","D2:E1"),network=fact("out" if office else "in","D2:E1"))
    claim["providers"]=[provider]
    entry=empty(SCHEMA["properties"]["services"]["items"])
    entry.update(id="SV1",provider_id=provider_id,description=fact(service,"D2:E1"),date=fact("2026-09-10","D2:E1"),code=fact(code,"D2:E1"),code_system=fact("fictional_internal","D2:E1"),submitted_pos=fact("11" if office else "22","D2:E1"))
    if office:entry["actual_setting"]=fact("office","D3:E1")
    claim["services"]=[entry]
    eob=empty(SCHEMA["properties"]["eobs"]["items"])
    eob.update(id="EOB1",service_id="SV1",claim_id=fact(claim_id,"D2:E1"))
    for key in eob["financial"]:
        if key!='allowed_cents':eob["financial"][key]=fact(charge if key in {'billed_cents','member_cents'} else 0,"D2:E1")
    claim["eobs"]=[eob]
    for key,val in dict(claim_id=claim_id,reason_code="SYN-NET-O" if office else "SYN-AUTH-MISSING",
                        reason="Non-emergency out-of-network office service excluded" if office else "No prior authorization matched to the submitted MRI claim",
                        type="network" if office else "authorization",notice_date="2026-09-18",final_internal=False).items():
        claim["denial"][key]=fact(val,"D2:E2")
    if not office:
        approval=empty(SCHEMA["properties"]["authorizations"]["items"])
        for key,val in dict(id="SYN-APPROVAL-202",start="2026-09-01",end="2026-09-30",scope="One Knee MRI",provider_id=provider_id,service_code=code).items():approval[key]=fact(val,"D3:E1")
        claim["authorizations"]=[approval]
    styles=getSampleStyleSheet()
    styles['BodyText'].leading=16
    for doc in docs:
        story=[Paragraph(doc['title'],styles['Title']),Paragraph('SYNTHETIC / DEMONSTRATION DATA',styles['Heading2']),Spacer(1,.15*inch)]
        for index,text in enumerate(doc['sections'],1):
            ref=f"{doc['id']}:E{index}"
            story += [Paragraph(f"Record {ref}",styles['Heading3']),Paragraph(text,styles['BodyText']),Spacer(1,.1*inch)]
            claim['evidence'].append(dict(id=ref,domain='plan' if doc['kind']=='policy' else 'user',kind='denial' if ref=='D2:E2' else doc['kind'],document_id=doc['id'],source_id=None,source_url=None,
                location=dict(page=1,section=f"Record {ref}",start_char=None,end_char=None,bbox=None),text=text,text_kind='verbatim',content_sha256=hashlib.sha256(text.encode()).hexdigest(),verification='human_reviewed',authority_scope='Synthetic document',accessed_at=None))
        SimpleDocTemplate(str(folder/(doc['id']+'.pdf')),pagesize=(612,792),leftMargin=48,rightMargin=48,topMargin=36,bottomMargin=36).build(story)
    claim['policy_provisions']=[dict(id=f'P{index}',section=str(index),topic=topic,evidence_ids=[f'D1:E{index}']) for index,topic in [(2,'network exclusion and exception'),(3,'authorization'),(4,'appeal')]]
    (folder/'documents.json').write_text(json.dumps(docs,indent=2)+'\n')
    (folder/'expected-extraction.json').write_text(json.dumps(claim,indent=2)+'\n')
    (folder/'expectations.json').write_text(json.dumps(dict(outcome='likely_correct' if office else 'possible_processing_error',category='network' if office else 'authorization',corrected_liability_cents=None),indent=2)+'\n')


if __name__=='__main__':
    for category in ('office','authorization'):build(category)
