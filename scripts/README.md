# Repository tooling

Only cross-project maintenance belongs here (future contract generation, source validation and fixture packaging). Application workflows belong in apps/api; preparation authoring tools remain in claimbridge-prep/tools. Do not introduce a miscellaneous helpers module shared by unrelated layers.

## Live model evaluation

These commands send synthetic test documents to the configured provider and can consume credits. The launcher parses `.env` without executing it; exported settings take precedence.

```sh
node scripts/evaluate-live.mjs --probe
node scripts/evaluate-live.mjs --smoke
node scripts/evaluate-live.mjs
```

Use `--scenario original|office|authorization --repetitions 1|2|3` to investigate a specific packet. The full default suite performs 12 analyses: three original initial, three original with D06, three office and three authorization. It stops at the first failed job or automatic gate and exits nonzero. Outputs and evaluation-only raw synthetic candidates are written to ignored `var/evaluations/`; neither candidate files nor expected answers are runtime inputs. Inspect important facts against their complete source passages even when automatic gates pass.

## Verify downstream workflow without provider calls

```sh
PYTHONPATH=apps/api/src .venv/bin/python scripts/verify_live_workflow.py var/evaluations/RUN_ID
```

Use a successful current-version live evaluation directory. This takes a consistent SQLite backup into a separate verification directory, leaving recorded live runs unchanged. The verifier disables provider extraction entirely and exercises receipt-date regeneration, stale actions/drafts, draft editing and reopening, optimistic version checks and preserved history using saved actual-model extraction. It writes `workflow-verification.json`. This is API verification; it does not replace browser upload/export testing or independent source review.
