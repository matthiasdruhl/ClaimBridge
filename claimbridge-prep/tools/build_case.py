"""Rebuild synthetic PDFs, editable text, page data and hashed manifest. No network calls."""
from pathlib import Path
import json, hashlib, html
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
R=Path(__file__).resolve().parents[1]
D=R/'demo-case/documents'
docs={}
def doc(id,name,title,pages,stage='initial'):
 docs[id]={'id':id,'name':name,'title':title,'stage':stage,'pages':pages}
def page(title,sections): return {'title':title,'sections':sections}
def sec(id,title,text): return {'id':id,'title':title,'text':text}
doc('D01','01-plan','Lumen Meadow Employee Health Plan',[
page('2026 Summary Plan Description - demonstration edition',[
sec('P1','1. Plan identity','SYNTHETIC / DEMONSTRATION DATA. Fictional abbreviated SPD, not a complete legally compliant benefit booklet. Plan sponsor: Lumen Meadow Design LLC. Plan ID: LM-2026-EPO. Administrator: Lumen Meadow Benefits Committee. Claims administrator: Harborlight Benefit Services (fictional). This is a private, single-employer self-funded ERISA group health plan, not an insurance policy issued by Harborlight. The plan is non-grandfathered. Plan year January 1 through December 31, 2026. California member residence does not change this funding designation.'),
sec('P2','2. Member and eligibility','Member: Avery Rowan. Member ID: SYN-M1042. Individual coverage effective January 1, 2026; active through September 24, 2026 in this demonstration. Member services: benefits@harborlight.example (non-operational). Group: SYN-LM26. No other health coverage is recorded, but members must report any other coverage.'),
sec('P3','3. Enrollment administration','Address and dependent updates may be submitted through the demonstration member portal. Keep a copy of notices. This excerpt includes relevant benefit terms and selected unrelated benefits. A real reviewer should obtain all controlling plan documents and amendments.')]),
page('Benefits schedule',[
sec('P4','4. Individual medical benefits','Annual in-network deductible: $1,000. Annual in-network out-of-pocket maximum: $5,000. Covered outpatient surgery facility services and associated anesthesiology: 20% member coinsurance after the deductible; no separate copayment. Applicable statutory cost-sharing limits and exceptions control. The deductible and out-of-pocket ledger on the EOB shows processing status, not proof of payment.'),
sec('P5','5. Other services','Primary-care office visit: $25 copayment. Specialist office visit: $40 copayment. Covered preventive services use the preventive-benefit schedule. Outpatient physical therapy: 20% after deductible, ordinarily 20 visits per plan year subject to the plan review process. Retail pharmacy: generic tier $10; preferred brand tier $35. Dental cleaning and routine adult vision hardware are outside this medical demonstration benefit.'),
sec('P6','6. Coordination and reimbursement','When other coverage exists, the administrator will request details before determining payer order under the controlling coordination provisions. Itemized receipts may be requested for member-submitted reimbursement. This abbreviated booklet does not establish a universal coordination rule.')]),
page('Network and facility exceptions',[
sec('P7','7. General network restriction','Non-emergency services by out-of-network providers are excluded unless an exception in Section 8 or another controlling requirement applies. Network status must be determined for the specific provider or facility and the service date. A participating facility does not necessarily mean every clinician participates.'),
sec('P8','8. Protected facility services','Covered non-emergency anesthesiology furnished by a nonparticipating provider during a visit to a participating hospital, hospital outpatient department or ambulatory surgical center is handled using applicable federal surprise-billing protections. For those services, the plan applies in-network cost sharing based on the legally applicable recognized amount and credits applicable in-network accumulators. Provider reimbursement is determined separately. An ordinary office visit is not automatically a visit to a qualifying facility.'),
sec('P9','9. Provider charges','Protected cost sharing can still be owed. A bill alone does not determine the legally collectible balance. If an item is disputed, ask for the submitted claim, service location and an explanation of benefit calculations. The patient should not determine or change medical billing codes without the provider reviewing the actual services.')]),
page('Authorization and coverage administration',[
sec('P10','10. Authorization scope','Scheduled outpatient knee arthroscopy requires advance review. Associated anesthesia for an approved covered surgery does not require a separate authorization under this fictional plan. Approval applies to the specified service, facility and date range. It does not establish the actual place of service, continued enrollment, claim coding or final payment amount.'),
sec('P11','11. Exclusions and review','Purely cosmetic services and noncovered convenience items are excluded under this demonstration plan. Medical necessity, benefit exclusions and a missing authorization are different review issues. An adverse notice should identify the basis for its decision. Do not infer a clinical denial from an administrative or network denial.'),
sec('P12','12. Claim submission','For this demonstration plan, initial claims ordinarily must be submitted within 365 days of service, subject to applicable exceptions. This is a fictional plan term, not a federal filing deadline. Members may obtain help from the claims administrator if a provider cannot submit. Original receipts should be retained.')]),
page('Member claims and appeal rights',[
sec('P13','13. Internal appeal','This plan has one mandatory internal appeal level. Submit a written appeal within 180 calendar days after receiving the adverse determination. For the demonstration deadline calculation, exclude the receipt date and add 180 days; submit early and retain proof. Identify the member, claim, disputed decision, requested remedy and supporting records. Use the demo appeal intake at appeals@harborlight.example; this address is fictional and must never receive real records. A correction request does not extend the appeal deadline under these plan terms.'),
sec('P14','14. Review and records','The plan will provide relevant claim records free on request. A new reviewer will consider the appeal. The plan provides a post-service appeal decision within 60 days after receipt of the appeal. Ask for copies of the submitted claim data, applicable rules and the basis for the location classification.'),
sec('P15','15. Further review and help','Eligible unresolved claims may use the applicable federal external-review process administered through a contracted independent review organization. The final internal adverse notice will provide instructions and the deadline. This plan is not assigned to the HHS-administered process in this demo. Contact the plan administrator or U.S. DOL EBSA for help with plan claims rights; applicable provider surprise-billing concerns can also be raised with the CMS No Surprises Help Desk. This excerpt is demonstration material, not an actual notice of rights.')])])
doc('D02','02-eob','Harborlight - Explanation of Benefits',[
page('Claim SYN-C260812-A - anesthesia',[
sec('E1','Member and service','SYNTHETIC / DEMONSTRATION DATA. THIS IS NOT A BILL. Statement date: August 28, 2026. Member: Avery Rowan / SYN-M1042. Plan: LM-2026-EPO. Claim received: August 18, 2026. Service date: August 12, 2026. Billing/rendering provider: Seabright Anesthesia Group, provider ID SYN-P-AN1. Network: out-of-network. Service: anesthesia associated with knee arthroscopy. Internal demo service code SYN-AN-KNEE, not a CPT or HCPCS code.'),
sec('E2','Adjudication detail','Claim line: 1. Billed: $4,200.00. Allowed amount: not determined (shown as --). Plan paid: $0.00. Member responsibility as adjudicated: $4,200.00. Deductible applied to this line: $0.00. Copayment: $0.00. Coinsurance applied: $0.00. Noncovered amount: $4,200.00. Contractual adjustment: $0.00. Do not interpret -- as $0.00.'),
sec('E3','Reason and submitted location','Reason code SYN-NET07 (Harborlight demonstration code): non-emergency out-of-network office service excluded under Section 7. Submitted place-of-service code: 11. Service facility identifier: blank on submitted anesthesia claim. Please see the adverse benefit determination dated August 28, 2026 for appeal rights.'),
sec('E4','Accumulator snapshot','Individual in-network deductible used: $1,000 of $1,000. Individual in-network out-of-pocket amount credited: $2,400 of $5,000 after the facility claim on page 2. Denied anesthesia charges did not increase either accumulator. Snapshot includes other claims; no payment receipt is implied.')]),
page('Related claim SYN-C260812-F - facility; do not merge balances',[
sec('E5','Facility claim detail','Member SYN-M1042; service August 12, 2026. Provider: Juniper Bay Surgery Center, facility ID SYN-F-2401. Network adjudication: in-network. Service: knee arthroscopy facility services. Place-of-service code: 24. Internal service code SYN-FAC-KNEE (not a medical code). Authorization reference SYN-AUTH-771. Status: paid. Billed $12,000.00; allowed $6,000.00; contractual adjustment $6,000.00; plan paid $4,800.00; member responsibility $1,200.00. Deductible $0.00; copayment $0.00; coinsurance $1,200.00.'),
sec('E6','Important context','Before this facility claim, the in-network deductible was fully met and $1,200 was credited to the out-of-pocket maximum. The facility claim adds $1,200, resulting in $2,400. This is a separate claim, not a $1,200 payment on the anesthesia bill. Facility adjudication is supporting evidence about the encounter; it does not establish where every professional service occurred.')])])
doc('D03','03-denial','Harborlight - Adverse Benefit Determination',[
page('Initial post-service decision - August 28, 2026',[
sec('N1','Claim and decision','SYNTHETIC / DEMONSTRATION DATA. Notice date: August 28, 2026. To Avery Rowan, member SYN-M1042. Claim SYN-C260812-A; service August 12, 2026; Seabright Anesthesia Group; billed $4,200.00. We denied this claim under plan Section 7, General network restriction. Reason SYN-NET07: non-emergency out-of-network office service. Our submitted claim record lists place of service 11 and no facility identifier. We therefore did not apply Section 8. This is not a medical-necessity determination or a separate prior-authorization denial.'),
sec('N2','How to appeal','You may submit one internal appeal within 180 calendar days after you receive this notice. The date you received it is not recorded here. Include claim/member IDs, why you disagree and supporting records. A corrected claim or phone call does not extend that deadline under this plan. Demo intake: appeals@harborlight.example (fictional; do not send). For this post-service claim we will decide your appeal within 60 days of receiving it.'),
sec('N3','Documents and further rights','You may request relevant claim records free of charge, including the submitted service-location fields and the plan provisions relied on. A final adverse appeal decision will explain any available federal external review through our contracted IRO. You may also have rights under ERISA Section 502(a) following an adverse decision on review. The plan administrator and U.S. DOL EBSA can assist with plan claims questions. This fictional abbreviated notice is for demonstration only.')])])
doc('D04','04-provider-bill','Seabright Anesthesia Group - Patient Statement',[
page('Statement SYN-B-905 - September 5, 2026',[
sec('B1','Account','SYNTHETIC / DEMONSTRATION DATA. Member/patient Avery Rowan, SYN-M1042. Account SYN-AC-901. Claim reference SYN-C260812-A. Service August 12, 2026: anesthesia associated with knee arthroscopy. Internal code SYN-AN-KNEE; not a medical billing code. Billing office: Seabright Anesthesia Group, California. Service facility is not printed on this statement.'),
sec('B2','Account activity','Statement date: September 5, 2026. Original charge: $4,200.00. Insurance payment: $0.00. Patient payments posted: $0.00. Adjustments: $0.00. Current balance requested: $4,200.00. Requested payment date: October 5, 2026. This payment request is not your health-plan appeal deadline. This statement reflects the current ledger and does not independently establish final liability.'),
sec('B3','Questions and assistance','For a disputed claim, request an itemized account and billing review. You may ask whether a temporary collection hold is available; no hold has been granted in this demonstration. Account questions: billing@seabright.example (fictional and non-operational). Payments on other provider accounts are not automatically applied to this account. Keep copies of correspondence.')])])
doc('D05','05-authorization','Harborlight - Prior Review Approval',[
page('Authorization SYN-AUTH-771 - July 28, 2026',[
sec('A1','Approved request','SYNTHETIC / DEMONSTRATION DATA. Avery Rowan / SYN-M1042; plan LM-2026-EPO. Scheduled outpatient knee arthroscopy at Juniper Bay Surgery Center, facility ID SYN-F-2401. Approved date range: August 10 through August 20, 2026; one encounter. Scheduled date: August 12, 2026. Facility network shown as participating as of this approval. Scheduling reference SYN-ENC-812.'),
sec('A2','Scope and limitations','This approval concerns the proposed surgery and named facility. Associated anesthesia for an approved covered surgery requires no separate prior authorization under plan Section 10. Eligibility, actual services, location and claim data remain subject to review. This letter is not proof the scheduled visit occurred or that every clinician participates. It does not quote a negotiated anesthesia rate or determine patient responsibility.'),
sec('A3','Administrative instructions','If the procedure location, date range or service changes, contact the administrator. Facility billing and professional billing may be separate. Preserve this authorization reference with the operative encounter documents. Contact authorization@harborlight.example for this fictional exercise only.')])])
doc('D06','06-location-confirmation','Encounter and Network Confirmation Packet',[
page('Juniper Bay Surgery Center - encounter record',[
sec('L1','Encounter verification - September 15, 2026','SYNTHETIC / DEMONSTRATION DATA. Avery Rowan / SYN-M1042. Encounter SYN-ENC-812. Service August 12, 2026, Juniper Bay Surgery Center, SYN-F-2401. The knee arthroscopy and associated anesthesia were both performed within our licensed ambulatory surgical center. Seabright Anesthesia Group supplied anesthesia during this encounter. No anesthesia was performed in an adjacent office. This confirmation does not reproduce the electronic claim sent by Seabright.'),
sec('L2','Other encounter information','Check-in 07:10; discharged home 11:20. Accompanying adult documented in facility chart but omitted from this synthetic extract. Routine postoperative instructions were provided. Clinical indication and medical necessity are not adjudicated by this administrative confirmation. Actual procedure coding should be verified by the billing provider.')]),
page('Harborlight member-services message - September 16, 2026',[
sec('L3','Service-date network confirmation','SYNTHETIC / DEMONSTRATION DATA. Regarding member SYN-M1042 and facility SYN-F-2401: Juniper Bay Surgery Center was participating in LM-2026-EPO on August 12, 2026. Seabright Anesthesia Group was nonparticipating on that date. Our facility claim SYN-C260812-F was paid as in-network. We have not yet reprocessed anesthesia claim SYN-C260812-A.'),
sec('L4','Outstanding review','The submitted anesthesia service-location fields should be checked against the encounter record. We have not determined the recognized amount for protected anesthesia cost sharing, any corrected payment, or a new member balance. A request for a collection hold must be discussed separately with the billing provider. This correspondence is not an appeal decision and does not extend an appeal filing deadline.')])],stage='clarification')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyCB',fontName='Helvetica',fontSize=10,leading=14,spaceAfter=9,textColor=colors.HexColor('#26354a')))
styles.add(ParagraphStyle(name='HeadCB',fontName='Helvetica-Bold',fontSize=12,leading=16,spaceBefore=12,spaceAfter=7,textColor=colors.HexColor('#123d50')))
styles.add(ParagraphStyle(name='TitleCB',fontName='Helvetica-Bold',fontSize=20,leading=25,spaceAfter=16,textColor=colors.HexColor('#123d50')))

def footer(canvas,document):
 canvas.saveState(); canvas.setFillColor(colors.HexColor('#a63f24')); canvas.setFont('Helvetica-Bold',9)
 canvas.drawString(44,766,'SYNTHETIC / DEMONSTRATION DATA - NOT A REAL PATIENT RECORD')
 canvas.setStrokeColor(colors.HexColor('#d8e3e7')); canvas.line(44,752,568,752)
 canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#536777'))
 canvas.drawString(44,28,document.title+' | '+str(document.page));canvas.restoreState()
manifest=[]
for d in docs.values():
 story=[]; md=['# '+d['title'],'','SYNTHETIC / DEMONSTRATION DATA']
 for i,p in enumerate(d['pages'],1):
  if i>1: story.append(PageBreak())
  story.append(Paragraph(html.escape(p['title']),styles['TitleCB']));md+=['',f'## Page {i}: '+p['title']]
  for s in p['sections']:
   story.append(Paragraph(html.escape(s['id']+' | '+s['title']),styles['HeadCB']))
   if s['id']=='E2':
    table=Table([['Billed','Allowed','Plan paid','Member*'],['$4,200.00','--','$0.00','$4,200.00']],colWidths=[125]*4)
    table.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#a8bbc4')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8f0f3')),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story.append(table);story.append(Spacer(1,8))
   story.append(Paragraph(html.escape(s['text']),styles['BodyCB']));md+=['',f"### {s['id']} | {s['title']}",'',s['text']]
 path=D/(d['name']+'.pdf')
 pdf=SimpleDocTemplate(str(path),pagesize=(612,792),leftMargin=44,rightMargin=44,topMargin=58,bottomMargin=48,title=d['title'],author='ClaimBridge synthetic demonstration')
 pdf.build(story,onFirstPage=footer,onLaterPages=footer)
 (D/(d['name']+'.md')).write_text('\n'.join(md)+'\n')
 manifest.append(dict(id=d['id'],title=d['title'],path='documents/'+path.name,stage=d['stage'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),pages=len(d['pages']),synthetic=True))
(R/'demo-case/document-pages.json').write_text(json.dumps(docs,indent=2)+'\n')
(R/'demo-case/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Created',len(docs),'PDFs; intended pages:',sum(len(d['pages']) for d in docs.values()))
