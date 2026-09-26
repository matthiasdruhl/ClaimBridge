# ClaimBridge MVP

**Job:** help a person facing a confusing claim understand the stated decision, identify contradictory evidence, obtain missing facts and prepare the appropriate next step.

**Primary user:** consumer with a post-service private medical claim and access to plan/EOB/bill documents. **Supported demo:** one anesthesia network/setting dispute. **Success:** a judge can follow the evidence from a $4,200 bill to a conditional facility exception and a reviewable action packet in four minutes.

## P0 capabilities

Upload six synthetic PDFs in two stages; extract identity, service and financial fields; keep related facility claim separate; retrieve exclusion and exception; surface location conflict; ask location/receipt/payment questions; show plan and government evidence distinctly; recalculate deadline after receipt answer; show an editable appeal draft with unresolved final amount.

A clear 'We need more information' state is a successful output when evidence is absent. No final savings banner, automatic appeal sending, medical necessity determination, live insurer integration, coverage shopping or broad insurance chatbot is in scope.

## Acceptance criteria

- Clicking 'Why?' on every important conclusion opens matching evidence, source class, page/section and document version.
- Initial state does not know actual anesthesia setting or the receipt date.
- Uploading D06 changes the supported analysis while preserving original POS 11.
- No exact corrected liability appears without the missing recognized amount.
- Monetary totals and due dates use deterministic code.
- Wrong or unsupported plan type produces a bounded explanation, not an invented route.
- Replay mode is plainly labeled and never presented as live model output.

## Deliberate assumptions

Two developers, one focused build day, desktop judge display, English born-digital PDFs, synthetic-only data, local app and network access for optional model calls. Validate these against event rules. Document layout complexity and model latency are the main technical uncertainties. No willingness-to-pay claim has been tested.
