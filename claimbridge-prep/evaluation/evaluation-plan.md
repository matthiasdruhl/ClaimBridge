# Evaluation plan

Separate artifact quality, deterministic primitive behavior and live application performance. Preparation validates the first two. It does not measure LLM accuracy, real-world claim success or production readiness.

## Automated evaluation

`experiments/run_tests.py` checks PDFs, money, date handling, schema/semantic constraints, a long-corpus retrieval query, malformed/encrypted/image-only files, and known negative outputs. `evaluation/evaluate.py` validates a candidate Claim JSON against schema and stage-specific golden-tests.json. Initial and clarified fixtures serve as smoke tests of the evaluator, not evidence that an AI passed. Use actual application output during hackathon.

| Dimension | Measurement | Release gate for this case |
|---|---|---|
| Document understanding | ID/date/reason/code exact matches | Every critical field correct; blanks preserved |
| Finance | cents, ledger math, separate claims, unknown allowance | Zero errors or invented liability |
| Policy retrieval | P7/P8 top six; P13 for appeal | Exclusion and exception together |
| External retrieval | correct source plus scope; prohibited route review | R02/R03 appropriate; no CDI default |
| Grounding | resolvable IDs, matching spans + human support check | All important conclusions supported or explicitly conditional |
| Missing information | location, receipt, recognized amount | No silent completion |
| Clarification | before/after changes, retained history | D06 strengthens support; receipt remains user-reported |
| Reasoning | compare alternatives and uncertainty with golden analysis | No premature insurer-fault or medical-necessity assertion |
| Actionability | correction, records, timely appeal, conditional escalation | Includes actionable owners and evidence; no auto-submission |

Deterministic JSON assertions cannot establish that a valid citation entails the prose. Human review must inspect statement/support pairs, applicability and contradictory evidence. Do not hide a failure behind a mean score: money, deadline, source fabrication and false completion are blocking failures.

## During the hackathon

Run each base stage three times with the chosen model, record model/version, prompt version, input hashes, latency and validation retries. Then execute adversarial-cases.json against mutated input documents, keeping gold answers out of runtime retrieval. Measure answer stability rather than only the best run. Starting demo target: under 30 seconds total analysis on the fixed packet, under 5 seconds for deterministic clarification update; these targets are unmeasured assumptions.

Compare with generic document chat on the same files: field accuracy, citation entailment, missing facts, action correctness and presenter effort. Differentiation is unproven until comparison. Do not use an LLM judge as the sole evaluator.
