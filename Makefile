PYTHON ?= python3.12
VENV_PY := .venv/bin/python

.PHONY: setup-api dev-api dev-web check-api check-web check
setup-api:
	$(PYTHON) -m venv .venv
	$(VENV_PY) -m pip install -r apps/api/requirements-dev.lock
	$(VENV_PY) -m pip install --no-deps --no-build-isolation -e apps/api

dev-api:
	CLAIMBRIDGE_DIAGNOSTICS=1 PYTHONPATH=apps/api/src $(VENV_PY) -m flask --app claimbridge:create_app run --host 127.0.0.1 --port 5001

dev-web:
	npm run dev:web

check-api:
	$(VENV_PY) -m ruff check apps/api
	$(VENV_PY) -m ruff format --check apps/api
	PYTHONPATH=apps/api/src $(VENV_PY) -m pytest apps/api/tests

check-web:
	node --experimental-strip-types --test tests/frontend/*.test.mjs
	npm run lint:web
	npm run typecheck
	npm run build:web
	npm run format:check

check: check-api check-web
