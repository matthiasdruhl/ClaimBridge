"""Document workspace HTTP boundary."""

from io import BytesIO

from flask import Blueprint, jsonify, request, send_file

from claimbridge.application.ingest import ingest
from claimbridge.infrastructure.workspaces import WorkspaceError


def workspace_blueprint(store):
    blueprint = Blueprint("workspaces", __name__)

    @blueprint.post("/workspaces")
    def create():
        if (request.get_json(silent=True) or {}).get("synthetic") is not True:
            raise WorkspaceError("This local build accepts synthetic demo documents only.")
        return jsonify(store.create()), 201

    @blueprint.get("/workspaces/<workspace_id>")
    def get(workspace_id):
        return jsonify(store.get(workspace_id))

    @blueprint.post("/workspaces/<workspace_id>/documents")
    def upload(workspace_id):
        file = request.files.get("file")
        if file is None:
            raise WorkspaceError("Choose a PDF to upload.")
        try:
            revision = int(request.form.get("expected_revision", ""))
        except ValueError:
            raise WorkspaceError("A workspace revision is required.") from None
        return jsonify(ingest(store, workspace_id, revision, file.filename, file.read())), 201

    @blueprint.get("/workspaces/<workspace_id>/documents/<document_id>/content")
    def content(workspace_id, document_id):
        response = send_file(
            BytesIO(store.original(workspace_id, document_id)),
            mimetype="application/pdf",
            download_name="document.pdf",
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    return blueprint
