"""Local diagnostics routes and request correlation."""

import math
import re
import sqlite3
import time
from uuid import uuid4

from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import HTTPException

from claimbridge.infrastructure.diagnostics import EventStore

TOKEN = re.compile(r"^[a-f0-9-]{32,36}$")
OPERATIONS = {"workspace.create", "workspace.read", "document.upload", "api.other", "app.failure"}
OUTCOMES = {"completed", "http_error", "network_error", "timeout", "invalid_response", "uncaught"}


def install_diagnostics(app, root):
    store = EventStore(root)
    app.extensions["diagnostics"] = store
    blueprint = Blueprint("diagnostics", __name__)

    @app.before_request
    def begin():
        supplied = request.headers.get("X-Request-ID", "")
        g.request_id = supplied if TOKEN.fullmatch(supplied) else uuid4().hex
        g.request_started = time.monotonic()

    @app.after_request
    def complete(response):
        response.headers["X-Request-ID"] = g.request_id
        if not request.path.startswith("/api/v1/diagnostics"):
            store.record(
                operation="http." + (request.endpoint or "unmatched"),
                request_id=g.request_id,
                status=response.status_code,
                duration_ms=round((time.monotonic() - g.request_started) * 1000, 2),
                severity="error"
                if response.status_code >= 500
                else "warning"
                if response.status_code >= 400
                else "info",
                outcome="http_error" if response.status_code >= 400 else "completed",
            )
        return response

    @app.errorhandler(Exception)
    def unexpected(error):
        if isinstance(error, HTTPException):
            return jsonify(
                error={"code": error.name, "message": error.name}, request_id=g.request_id
            ), error.code
        return jsonify(
            error={"code": "INTERNAL_ERROR", "message": "Unexpected server error."},
            request_id=g.request_id,
        ), 500

    @blueprint.get("/status")
    def status():
        database = "ready"
        try:
            with sqlite3.connect(f"file:{root / 'workspaces.sqlite3'}?mode=ro", uri=True) as db:
                db.execute("SELECT COUNT(*) FROM workspaces").fetchone()
        except sqlite3.Error:
            database = "unavailable"
        try:
            metrics = store.metrics()
            logs = "ready"
        except sqlite3.Error:
            metrics, logs = None, "unavailable"
        return jsonify(
            database=database,
            logging=logs,
            metrics=metrics,
            uptime_seconds=round(time.monotonic() - store.started),
            status="connected" if database == logs == "ready" else "degraded",
        )

    @blueprint.get("/events")
    def events():
        try:
            after = max(0, int(request.args.get("after", "0")))
        except ValueError:
            return jsonify(error={"message": "Invalid cursor."}), 400
        rows = store.read(
            after,
            request.args.get("source"),
            request.args.get("severity"),
            request.args.get("request_id"),
        )
        return jsonify(events=rows, cursor=rows[-1]["seq"] if rows else after)

    @blueprint.post("/events")
    def ingest():
        payload = request.get_json(silent=True)
        batch = payload.get("events") if isinstance(payload, dict) else None
        if not isinstance(batch, list) or not 1 <= len(batch) <= 50:
            return jsonify(error={"message": "Expected 1–50 events."}), 400
        for event in batch:
            if not isinstance(event, dict) or set(event) - {
                "id",
                "request_id",
                "operation",
                "outcome",
                "status",
                "duration_ms",
            }:
                return jsonify(error={"message": "Invalid event fields."}), 400
            if (
                not TOKEN.fullmatch(str(event.get("id", "")))
                or not TOKEN.fullmatch(str(event.get("request_id", "")))
                or event.get("operation") not in OPERATIONS
                or event.get("outcome") not in OUTCOMES
            ):
                return jsonify(error={"message": "Invalid event metadata."}), 400
            status_code, duration = event.get("status"), event.get("duration_ms")
            if status_code is not None and (
                type(status_code) is not int or not 100 <= status_code <= 599
            ):
                return jsonify(error={"message": "Invalid status."}), 400
            if duration is not None and (
                type(duration) not in (int, float)
                or not math.isfinite(duration)
                or not 0 <= duration <= 3600000
            ):
                return jsonify(error={"message": "Invalid duration."}), 400
        for event in batch:
            store.record(
                **event,
                source="frontend",
                severity="info" if event["outcome"] == "completed" else "error",
            )
        return "", 204

    app.register_blueprint(blueprint, url_prefix="/api/v1/diagnostics")
