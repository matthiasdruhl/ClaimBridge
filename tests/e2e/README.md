# Browser verification

An explicit offline harness lives in `serve_fixture.py`. Start it using `PYTHONPATH=apps/api/src:apps/api/tests .venv/bin/python tests/e2e/serve_fixture.py`, plus `make dev-web`. It uses temporary storage and a TEST-ONLY provider with a visible result label. Upload the original five PDFs, analyze, inspect citations, save receipt 2026-09-01, reanalyze, add D06, inspect the revised argument, and edit/save/export a draft. Use New workspace afterward. Stop both servers with Control+C. Never import this harness into production.

This is a manual browser harness, not an automated end-to-end suite. Actual model accuracy, full live browser rehearsal and timing remain pending API credits/configuration. Backend tests exercise all three scenarios and the D06 transition separately.
