# Synthetic golden case: the location that changed the claim

Every person, employer, plan, provider, identifier, dollar figure and encounter in this packet is fictional. Public sources in research/ are real. Local service codes beginning SYN are explicitly not CPT/HCPCS/ICD codes. POS 11 and 24 are real place-of-service taxonomy values (R06). No real patient records were copied.

**Demo clock:** September 24, 2026. **Patient:** Avery Rowan. **Plan:** Lumen Meadow, self-funded private ERISA, non-grandfathered, calendar 2026; Harborlight administers claims. **Disputed claim:** SYN-C260812-A. **Stake:** a $4,200 anesthesia bill, not a proven $4,200 loss or savings opportunity.

## Upload order

Initial: 01-plan.pdf, 02-eob.pdf (both pages), 03-denial.pdf, 04-provider-bill.pdf, 05-authorization.pdf. Hold back 06-location-confirmation.pdf until the location question. It corroborates both the encounter and facility participation on the service date.

The EOB describes an office claim; the authorization and separate paid facility claim indicate a surgical-center encounter. This is an evidence conflict, not proof of which party caused it. Source R04 contains a closely related federal regulatory example, not this patient story.

Presenter clarification: 'Both the surgery and anesthesia took place at Juniper Bay Surgery Center. Here is the facility confirmation and the plan's network message. I received the denial on September 1, 2026, and have not paid the anesthesia bill.' The receipt date and no-payment statement remain user-reported; label them as such.

The answer should strengthen after D06, but the application must still ask the provider/plan to validate the submitted anesthesia claim and determine the recognized amount. Never show a completed appeal, collection hold, or insurer reversal that has not happened.

Editable source documents are alongside PDFs. document-pages.json contains authoring truth for testing only; it must not be ingested by the live claim analyzer. manifest.json records actual PDF hashes. Ground-truth tests live outside runtime retrieval.
