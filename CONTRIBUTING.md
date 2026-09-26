# Contributing

Read docs/code-structure.md and the preparation golden analysis before modifying claim behavior.

- Use small changes around one feature or use case. Keep routes thin, pure rules in domain, and external SDKs in infrastructure.
- Preserve evidence and unknown values. Never invent source text, clinical conclusions, final liability or dates.
- Change canonical schemas before changing the wire format; update example fixtures, adapters and meaningful tests together.
- Keep versioned claim state authoritative on the server. User-reported facts remain distinguishable from document statements.
- Never commit credentials, real patient documents, databases or runtime uploads. The demo is synthetic-only.
- Keep golden answers in test/evaluation paths; never import them into the live analyzer.
- Use integer cents and explicit ISO dates. No floating-point money; no arbitrary numeric confidence.
- Add tests for behavior/risk, not each trivial component. Ordinary checks make no live LLM calls.
- Run `make check` before proposing a change. Run preparation probes when changing its artifacts, using its separate requirements.
- Update DECISIONS/TODO in claimbridge-prep when an important product or architectural assumption changes.

Branch convention: codex/<short-purpose>. No license has been selected; do not assume permission to publish others' proprietary documents. Follow the event's prepared-work disclosure rules.
