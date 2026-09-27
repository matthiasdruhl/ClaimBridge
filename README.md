# ClaimBridge

ClaimBridge is an evidence-backed medical claim analysis system that turns insurance documents into source-verified findings and an actionable appeal draft.

It is designed for the part of a claim dispute that is usually hardest for a patient: connecting a denial, Explanation of Benefits, plan language, bills, authorizations, and supporting records without merging unrelated claims or presenting unsupported details as facts.

## What it does

1. Upload a synthetic denial packet as PDF files.
2. Review the claim amount, the main finding, and the evidence chain behind it.
3. Open any cited passage and its original PDF page.
4. Add clarifications or supporting documents when important facts remain unknown.
5. Regenerate the analysis after new evidence while preserving prior revisions.
6. Review suggested next steps and create, edit, save, copy, or download an appeal draft.

ClaimBridge currently supports bounded network/location and prior-authorization scenarios. It does not adjudicate claims, calculate final liability, submit appeals, or replace professional review.

## Why the approach is different

ClaimBridge is not a `PDFs → LLM → answer` pipeline.

The model handles fuzzy document understanding: it maps varied insurance language into a structured claim and selects numbered source passages. Application code then restores the exact text from the uploaded PDFs, validates every reference and structured field, and performs bounded downstream reasoning.

```text
Documents
  → structured extraction
  → evidence selection
  → exact source restoration
  → schema and provenance validation
  → bounded claim reasoning
  → uncertainty and clarification
  → action plan and appeal draft
```

Important safeguards include:

- immutable PDF hashes and revision-checked workspaces;
- exact-match restoration of document evidence instead of model-written quotations;
- validation of document IDs, pages, offsets, facts, money fields, and entity references;
- separate handling of related EOBs and bills so amounts are not silently combined;
- explicit `unknown`, `user_reported`, and `conflicted` states;
- deterministic money/date calculations, conclusions, actions, and draft templates after extraction;
- no endpoint that submits an appeal.

The current live adapter uses Chat Completions with JSON Schema output. The retained evaluation used Meta `muse-spark-1.3-contributor`, prompt `claim-extraction-v9`, and pipeline `bounded-analysis-v3`.

## Demo Mode

Demo Mode makes the judging path fast without pretending to perform a live model call.

It accepts only the exact synthetic five-document or six-document packet in [`claimbridge-prep/demo-case`](claimbridge-prep/demo-case), matched by PDF SHA-256. For a match, it loads extraction snapshots retained from validated provider runs, maps them to the newly uploaded documents, restores and revalidates every cited passage against those PDFs, and runs the normal deterministic reasoning, revision, clarification, action-plan, and draft workflow.

Unknown, incomplete, or modified packets are rejected. Demo Mode never calls the model provider and labels its result as retained validated analysis.

## Evaluation

The final provider-backed synthetic suite passed **12/12 automatic gates**:

- three initial network/location runs;
- three runs with the location-confirmation document;
- three independent office-scenario runs;
- three independent authorization-scenario runs.

Median provider analysis time was **38.72 seconds**. Eleven runs passed on the first generation; one passed after the single permitted structured-output repair. These are measured results for the checked synthetic scenarios, not evidence of general medical, legal, or insurance accuracy.

The repository check currently covers **34 backend tests and 13 frontend tests**, plus Ruff, ESLint, TypeScript, production build, and formatting. See [`docs/live-validation.md`](docs/live-validation.md) for the measured run table and [`docs/claim-workflow.md`](docs/claim-workflow.md) for validation boundaries.

## Run locally

Requirements: Node 24, npm, Python 3.12, and a POSIX shell for the Make targets.

```sh
npm ci --ignore-scripts
make setup-api
make dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The API health endpoint is [http://127.0.0.1:5001/api/v1/health](http://127.0.0.1:5001/api/v1/health).

Demo Mode needs no provider credential. Live extraction requires these backend-only values in the ignored root `.env`:

```sh
CLAIMBRIDGE_API_KEY=...
CLAIMBRIDGE_API_BASE_URL=https://provider.example/v1
CLAIMBRIDGE_MODEL=...
```

Existing environment variables take precedence. Never place credentials in `VITE_*` variables. Run `node scripts/dev.mjs --check` for startup preflight without launching the services.

Run the complete local check with:

```sh
make check
```

## Vultr deployment

These commands target a fresh Debian 12 Bookworm VM and the included `/opt/claimbridge` service paths. Demo Mode does not need a `.env` file or provider key. Debian 12 provides Python 3.11 by default, so the commands install the required Python 3.12 runtime for the service user with `uv`.

```sh
sudo apt update
sudo apt install -y ca-certificates curl git make nginx
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs

sudo useradd --system --user-group --create-home --home-dir /var/lib/claimbridge --shell /usr/sbin/nologin claimbridge
curl -LsSf https://astral.sh/uv/install.sh -o /tmp/uv-installer.sh
sudo -u claimbridge -H env UV_UNMANAGED_INSTALL=/var/lib/claimbridge/.local/bin sh /tmp/uv-installer.sh
sudo -u claimbridge -H /var/lib/claimbridge/.local/bin/uv python install 3.12

sudo git clone --branch codex/vultr-deployment https://github.com/matthiasdruhl/ClaimBridge.git /opt/claimbridge
sudo chown -R claimbridge:claimbridge /opt/claimbridge
cd /opt/claimbridge
sudo -u claimbridge -H npm ci --ignore-scripts
sudo -u claimbridge -H env PATH=/var/lib/claimbridge/.local/bin:/usr/local/bin:/usr/bin:/bin make setup-api
sudo -u claimbridge -H npm run build:web

sudo install -m 644 deploy/systemd/claimbridge.service /etc/systemd/system/claimbridge.service
sudo systemctl daemon-reload
sudo systemctl enable --now claimbridge

sudo install -m 644 deploy/nginx/claimbridge /etc/nginx/sites-available/claimbridge
sudo ln -sfn /etc/nginx/sites-available/claimbridge /etc/nginx/sites-enabled/claimbridge
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

sudo systemctl --no-pager --full status claimbridge nginx
curl http://127.0.0.1/api/v1/health
curl -I http://127.0.0.1/evaluation
```

Allow inbound TCP port 80 in the Vultr Firewall, then open `http://YOUR_VULTR_IP/`. Nginx serves the React build and keeps Flask private on `127.0.0.1:5001`; `/evaluation` and `/diagnostics` refresh through the SPA fallback. SQLite data and uploaded PDFs persist under `/var/lib/claimbridge`, created and owned by the service user. If you clone elsewhere, update `/opt/claimbridge` in both files under `deploy/`.

For optional live extraction, create `/opt/claimbridge/.env` with the existing `CLAIMBRIDGE_API_KEY`, `CLAIMBRIDGE_API_BASE_URL`, `CLAIMBRIDGE_MODEL`, and reasoning-effort settings, make it readable only by `claimbridge`, then restart the service. The service always keeps hosted data in `/var/lib/claimbridge`.

## Repository guide

- [`apps/web`](apps/web): React interface for upload, evidence review, clarification, actions, and appeal drafting.
- [`apps/api`](apps/api): Flask API, PDF ingestion, extraction adapter, validation, reasoning, persistence, and Demo Mode fixtures.
- [`claimbridge-prep`](claimbridge-prep): synthetic case materials, schemas, research, golden states, and evaluation design.
- [`scripts`](scripts): local launcher, live evaluation, retained-fixture export, and workflow verification tools.
- [`docs/claim-workflow.md`](docs/claim-workflow.md): runtime behavior, provider configuration, storage, and safety boundaries.
- [`docs/live-validation.md`](docs/live-validation.md): measured provider and workflow results.
- [`docs/code-structure.md`](docs/code-structure.md): module ownership and dependency rules.

Historical development evidence, including the saved browser walkthrough, remains under [`docs`](docs) but is not required to understand or run the project.

## Limitations

- The evaluated inputs are synthetic, English, and born-digital PDFs.
- There is no OCR, authentication, automated full-browser suite, or production-grade hosting hardening.
- The reasoning covers a narrow set of administrative denial scenarios, not clinical medical necessity.
- Plan interpretation and model classification can be wrong even when a citation is exact; applicability still requires human review.
- Corrected liability intentionally remains unknown until the plan adjudicates the claim.
- A notice date is not treated as proof of when the member received the notice, and a ledger showing no posted payment is not treated as proof that the member personally paid nothing.
- Appeal drafts require review of the destination, signature, deadline, attachments, and unresolved fields before use.
- The local diagnostics interface has no authentication and should remain disabled outside local development.

All included patient, provider, plan, claim, contact, and billing data is fictional demonstration data.
