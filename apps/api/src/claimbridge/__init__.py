"""Application composition root; importing the package performs no I/O."""

import os
from pathlib import Path

from flask import Flask, g, jsonify

from claimbridge.api.diagnostics import install_diagnostics
from claimbridge.api.health import blueprint
from claimbridge.api.workspaces import workspace_blueprint
from claimbridge.infrastructure.workspaces import WorkspaceError, WorkspaceStore


def create_app(test_config: dict[str, object] | None = None) -> Flask:
    """Create independent application instances for local development and tests."""
    app = Flask(__name__)
    app.config.from_mapping(MAX_CONTENT_LENGTH=20 * 1024 * 1024)
    if test_config is not None:
        app.config.update(test_config)
    app.register_blueprint(blueprint, url_prefix="/api/v1")
    root = app.config.get("DATA_DIR", Path(__file__).resolve().parents[4] / "var")
    app.register_blueprint(workspace_blueprint(WorkspaceStore(root)), url_prefix="/api/v1")

    if app.config.get("DIAGNOSTICS_ENABLED", os.environ.get("CLAIMBRIDGE_DIAGNOSTICS") == "1"):
        install_diagnostics(app, Path(root))

    @app.errorhandler(WorkspaceError)
    def workspace_error(error):
        return jsonify(
            error={"code": "WORKSPACE_ERROR", "message": str(error)},
            request_id=getattr(g, "request_id", None),
        ), error.status

    @app.errorhandler(413)
    def too_large(error):
        return jsonify(error={"code": "FILE_TOO_LARGE", "message": "Upload under 20 MB."}), 413

    return app
