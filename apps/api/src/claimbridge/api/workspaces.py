"""Document workspace HTTP boundary."""

from io import BytesIO

from flask import Blueprint, current_app, g, jsonify, request, send_file

from claimbridge.application.ingest import ingest
from claimbridge.infrastructure.workspaces import WorkspaceError


def workspace_blueprint(store, demo_documents=None):
    blueprint = Blueprint("workspaces", __name__)

    @blueprint.post("/workspaces")
    def create():
        if (request.get_json(silent=True) or {}).get("synthetic") is not True:
            raise WorkspaceError("This local build accepts synthetic demo documents only.")
        return jsonify(store.create()), 201

    @blueprint.get("/workspaces/<workspace_id>")
    def get(workspace_id):
        return jsonify(store.get(workspace_id))

    @blueprint.post("/workspaces/demo")
    def create_demo():
        """Create the exact five-document workspace used by retained Demo Mode."""
        if demo_documents is None or not demo_documents.is_dir():
            raise WorkspaceError("The preloaded demo case is unavailable.", 503)
        paths = sorted(demo_documents.glob("0[1-5]-*.pdf"))
        if len(paths) != 5:
            raise WorkspaceError("The preloaded demo case is incomplete.", 503)
        state = store.create()
        for path in paths:
            state = ingest(
                store,
                state["id"],
                state["revision"],
                path.name,
                path.read_bytes(),
            )
        return jsonify(state), 201

    @blueprint.post("/workspaces/<workspace_id>/documents")
    def upload(workspace_id):
        file = request.files.get("file")
        if file is None:
            raise WorkspaceError("Choose a PDF to upload.")
        try:
            revision = int(request.form.get("expected_revision", ""))
        except ValueError:
            raise WorkspaceError("A workspace revision is required.") from None
        events = current_app.extensions.get("diagnostics")
        if events:
            events.record(operation="pdf.extract", outcome="started", request_id=g.request_id)
        try:
            state = ingest(store, workspace_id, revision, file.filename, file.read())
        except Exception:
            if events:
                events.record(
                    operation="pdf.extract",
                    outcome="failed",
                    severity="error",
                    request_id=g.request_id,
                )
            raise
        if events:
            from hashlib import sha256

            file.seek(0)
            digest = sha256(file.read()).hexdigest()
            document = next(
                item["document"]
                for item in state["documents"]
                if item["document"]["sha256"] == digest
            )
            events.record(
                operation="pdf.extract",
                outcome=document["status"],
                request_id=g.request_id,
                severity="info" if document["status"] == "ready" else "warning",
            )
        return jsonify(state), 201

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
