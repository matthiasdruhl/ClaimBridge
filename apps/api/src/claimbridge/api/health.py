"""Minimal liveness route. It does not claim dependency readiness."""

from flask import Blueprint

blueprint = Blueprint("health", __name__)


@blueprint.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "stage": "scaffold"}
