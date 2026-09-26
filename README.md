# ClaimBridge

Evidence-backed medical-claim navigation. This repository currently contains a verified preparation package and a local document workspace. Upload synthetic PDFs, inspect extracted page text, and reopen original documents. Claim analysis and appeal workflows remain in progress.

## Where to start

- [Repository/code structure](docs/code-structure.md): folder ownership, dependencies, planned modules and conventions.
- [Preparation package](claimbridge-prep/README.md): research, synthetic documents, golden analysis and evaluation.
- [Readiness report](claimbridge-prep/READINESS.md) and [build backlog](claimbridge-prep/engineering/implementation-plan.md).
- [Contribution rules](CONTRIBUTING.md).

## Requirements

Node 24, npm and Python 3.12. `.nvmrc` and `.python-version` record the intended versions. Run all commands below from the repository root. Windows users can run the equivalent Python/npm commands directly; Make targets assume a POSIX shell.

```sh
npm ci --ignore-scripts
make setup-api
```

If the Python executable is named differently, use `make setup-api PYTHON=/path/to/python3.12`.

Run in two terminals:

```sh
make dev-api
```

```sh
make dev-web
```

Frontend: http://127.0.0.1:5173. API health: http://127.0.0.1:5001/api/v1/health. Vite proxies /api locally. The workspace stores original PDFs and page text in local SQLite under var/. Uploads are revision-checked and deduplicated. Encrypted and non-text pages are explicitly flagged. Model extraction of claim facts, analysis and appeals are not implemented yet.

## Checks

```sh
make check
```

This runs backend smoke tests/format/lint and frontend type/lint/build/format checks. CI uses the same gates. Existing preparation probes have separate instructions in claimbridge-prep/experiments/README.md.

## Data and contracts

Canonical claim/evidence schemas stay in claimbridge-prep/schemas; contracts/README.md explains future transport generation. Runtime data belongs in ignored var/. Secrets stay server-side. Never place real records or golden-answer fixtures under frontend public assets. No model provider or credential is required to run the scaffold.

## First implementation slice

Upload -> extract PDF pages -> validated claim state -> display cited facts. Then add scoped retrieval, conditional analysis, clarification revisions, appeal strategy and draft. The appeal view must explain why an argument addresses the denial and link to its supporting plan/document/external evidence.
