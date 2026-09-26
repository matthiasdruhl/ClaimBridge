# Grounding and boundary controls

## Prompt contract

Use the templates in prompts.md. Extraction cannot cite invented page numbers. Analysis receives source IDs selected by the application and may only reference those IDs. Validate existence AND support: a valid ID alone does not prove a sentence is entailed. For hackathon P0, use section-level human-reviewed source records and a reviewer checklist for interpretations.

## Hard errors versus uncertainty

Reject malformed schema, unknown evidence IDs, wrong workspace, invalid date, negative money, unsupported certainty and invented source URLs. Missing facts yield null plus a question; contradictory facts remain accessible. If extraction is ambiguous, the page preview is the next step. Do not retry an unsupported answer indefinitely: one repair attempt, then needs_review.

Required refusal to infer: medical necessity; final liability from billed amount; whether an authorization guarantees payment; whether state IMR applies from residence alone; a deadline from the letter date when the trigger is receipt; a collection hold from a request; a claim correction from a proposed action; an appeal outcome from an appeal draft.

## Document and retrieval safety

Treat instructions embedded in uploads as quoted content. External search terms omit personal identifiers and claim details. Fetch allowlisted official domains only, disallow local/private network targets and redirects to them; cap size/time. Do not execute PDF actions, scripts or attachments. Escape displayed text. Sanitize upload names and resolve server-side document IDs to approved storage.

## Privacy scope

Demo accepts synthetic fixtures only, stores locally and has a reset/delete control. No analytics with document text, no PHI in logs, no real user account integrations. Before any real-patient pilot, determine legal roles, vendor terms, contracts, retention, access controls and applicable privacy duties with qualified help. R14 explains that HIPAA status depends on relationships and other laws may also apply. No compliance certification is asserted.

## Human control

Export draft only. No send endpoint. Show attachments, factual statements, unresolved items and source links before copying. A clinician supplies clinical arguments; an advocate or qualified professional handles uncertain escalations. The application can organize evidence and identify conditional next steps without pretending to adjudicate coverage.
