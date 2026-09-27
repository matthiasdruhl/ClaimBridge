"""Application composition root; importing the package performs no I/O."""

import os
from pathlib import Path

from flask import Flask, abort, g, jsonify, send_from_directory

from claimbridge.api.analysis import analysis_blueprint
from claimbridge.api.diagnostics import install_diagnostics
from claimbridge.api.health import blueprint
from claimbridge.api.workspaces import workspace_blueprint
from claimbridge.application.analyze import AnalysisWorker
from claimbridge.infrastructure.analysis_store import AnalysisStore
from claimbridge.infrastructure.demo_fixtures import DemoFixtureCatalog
from claimbridge.infrastructure.llm import ModelProvider
from claimbridge.infrastructure.workspaces import WorkspaceError, WorkspaceStore


def create_app(test_config: dict[str, object] | None = None) -> Flask:
    """Create independent application instances for local development and tests."""
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(MAX_CONTENT_LENGTH=20 * 1024 * 1024)
    if test_config is not None:
        app.config.update(test_config)
    app.register_blueprint(blueprint, url_prefix="/api/v1")
    root = Path(
        app.config.get(
            "DATA_DIR",
            os.environ.get("CLAIMBRIDGE_DATA_DIR", Path(__file__).resolve().parents[4] / "var"),
        )
    )
    workspaces = WorkspaceStore(root)
    app.register_blueprint(workspace_blueprint(workspaces), url_prefix="/api/v1")

    if app.config.get("DIAGNOSTICS_ENABLED", os.environ.get("CLAIMBRIDGE_DIAGNOSTICS") == "1"):
        install_diagnostics(app, Path(root))

    analysis_store = AnalysisStore(workspaces)
    provider = app.config.get("MODEL_PROVIDER") or ModelProvider()
    demo_fixtures = DemoFixtureCatalog()
    worker = AnalysisWorker(
        analysis_store,
        provider,
        app.extensions.get("diagnostics"),
        demo_fixtures,
    )
    app.extensions["analysis_worker"] = worker
    app.extensions["analysis_store"] = analysis_store
    app.register_blueprint(analysis_blueprint(analysis_store, worker), url_prefix="/api/v1")

    @app.errorhandler(WorkspaceError)
    def workspace_error(error):
        return jsonify(
            error={"code": "WORKSPACE_ERROR", "message": str(error)},
            request_id=getattr(g, "request_id", None),
        ), error.status

    @app.errorhandler(413)
    def too_large(error):
        return jsonify(error={"code": "FILE_TOO_LARGE", "message": "Upload under 20 MB."}), 413

    frontend = Path(
        app.config.get(
            "FRONTEND_DIR",
            Path(__file__).resolve().parents[4] / "apps" / "web" / "dist",
        )
    ).resolve()

    @app.get("/")
    @app.get("/<path:path>")
    def frontend_app(path=""):
        if path == "api" or path.startswith("api/"):
            abort(404)
        requested = (frontend / path).resolve()
        if path and requested.is_relative_to(frontend) and requested.is_file():
            return send_from_directory(frontend, path)
        if (frontend / "index.html").is_file():
            return send_from_directory(frontend, "index.html")
        abort(404)

    return app
