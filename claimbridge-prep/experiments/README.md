# Reproduce preparation checks

From claimbridge-prep, use a Python 3.12 environment with requirements-prep.txt installed. Poppler is needed to regenerate renders; existing renders are included for the image-only PDF probe.

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements-prep.txt
.venv/bin/python experiments/run_tests.py
.venv/bin/python evaluation/evaluate.py demo-case/expected-initial.json --stage initial
.venv/bin/python evaluation/evaluate.py demo-case/expected-clarified.json --stage clarified
```

Run evaluate.py with the application's candidate Claim JSON during the hackathon. Expected fixtures passing themselves are only evaluator smoke checks. Source selection and the prompt-injection shape check are narrow code tests, not a live model evaluation.

Authoring tools: tools/build_case.py regenerates PDF/Markdown/doc-page JSON and PDF hashes; tools/build_schemas.py regenerates schemas and golden fixtures. Regenerating PDFs requires rerendering and visual review because byte hashes/geometry may change. The raw document sections are authoring truth, never runtime retrieval input.

This session used bundled Python and a temporary install of jsonschema in /private/tmp/claimbridge-prep-deps because it was absent from the bundle. Network access for that dependency was approved. No API/model credentials were used.
