"""Revision-aware workflow routes; no submission endpoint."""

from flask import Blueprint, g, jsonify, request

from claimbridge.domain.reasoning import draft_text
from claimbridge.infrastructure.workspaces import WorkspaceError


def analysis_blueprint(store, worker):
    bp = Blueprint("analysis", __name__)

    def body():
        result = request.get_json(silent=True)
        if not isinstance(result, dict):
            raise WorkspaceError("Provide a JSON object.")
        return result

    @bp.get("/provider-status")
    def provider_status():
        return jsonify(
            configured=worker.provider.ready,
            model=worker.provider.configuration["model"],
            live_validation="not_measured",
        )

    @bp.post("/workspaces/<workspace_id>/process")
    def process(workspace_id):
        data = body()
        if not worker.provider.ready:
            return jsonify(
                error={
                    "code": "PROVIDER_NOT_CONFIGURED",
                    "message": "Configure the backend API key, base URL and model before "
                    "running live analysis.",
                }
            ), 503
        job, created = store.start(
            workspace_id,
            data.get("expected_revision"),
            data.get("document_ids"),
            worker.configuration,
            getattr(g, "request_id", ""),
        )
        if created:
            worker.enqueue(job["job_id"])
        return jsonify(job), 202

    @bp.get("/jobs/<job_id>")
    def job(job_id):
        return jsonify(store.job(job_id))

    @bp.get("/workspaces/<workspace_id>/claim")
    def claim(workspace_id):
        state = store.workspaces.get(workspace_id)
        requested = request.args.get("revision", type=int)
        result = store.latest(workspace_id, requested)
        status = (
            "not_analyzed"
            if result is None
            else "stale"
            if result["revision"] != state["revision"]
            else (
                "needs_information"
                if any(item["status"] == "open" for item in result["claim"]["questions"])
                else "ready_for_review"
            )
        )
        with store.connect() as db:
            row = db.execute(
                "SELECT id FROM processing_jobs WHERE workspace_id=? ORDER BY created DESC LIMIT 1",
                (workspace_id,),
            ).fetchone()
            revisions = [
                item[0]
                for item in db.execute(
                    "SELECT revision FROM claim_revisions WHERE workspace_id=? "
                    "ORDER BY revision DESC",
                    (workspace_id,),
                )
            ]
            drafts = [
                item[0]
                for item in db.execute(
                    "SELECT id FROM appeal_drafts WHERE workspace_id=? ORDER BY rowid DESC",
                    (workspace_id,),
                )
            ]
        metadata = (
            {}
            if not result
            else {key: val for key, val in result["metadata"].items() if key != "extracted_claim"}
        )
        return jsonify(
            claim=None if not result else result["claim"],
            revision=state["revision"],
            analysis_status=status,
            metadata=metadata,
            revisions=revisions,
            draft_ids=drafts,
            job=store.job(row[0]) if row else None,
        )

    @bp.get("/workspaces/<workspace_id>/evidence/<evidence_id>")
    def evidence(workspace_id, evidence_id):
        state = store.workspaces.get(workspace_id)
        revision = request.args.get("revision", default=state["revision"], type=int)
        with store.connect() as db:
            row = db.execute(
                "SELECT data FROM claim_evidence WHERE workspace_id=? AND revision=? AND id=?",
                (workspace_id, revision, evidence_id),
            ).fetchone()
        if not row:
            raise WorkspaceError("Evidence not found for this revision.", 404)
        import json

        return jsonify(json.loads(row[0]))

    @bp.post("/workspaces/<workspace_id>/questions/<question_id>/answer")
    def answer(workspace_id, question_id):
        data = body()
        return jsonify(
            store.answer(
                workspace_id,
                data.get("expected_revision"),
                question_id,
                data.get("answer"),
                data.get("supporting_document_ids", []),
            )
        )

    @bp.post("/workspaces/<workspace_id>/action-plan")
    def actions(workspace_id):
        data = body()
        return jsonify(store.current(workspace_id, data.get("expected_revision"))["action_plan"])

    @bp.post("/workspaces/<workspace_id>/appeal-draft")
    def create_draft(workspace_id):
        data = body()
        revision = data.get("expected_revision")
        result = store.current(workspace_id, revision)
        if not result["action_plan"]["arguments"]:
            raise WorkspaceError("No supported argument is available for a draft.", 422)
        draft = draft_text(result["claim"], result["action_plan"])
        return jsonify(store.create_draft(workspace_id, revision, draft)), 201

    @bp.get("/workspaces/<workspace_id>/appeal-drafts/<draft_id>")
    def get_draft(workspace_id, draft_id):
        return jsonify(store.draft(workspace_id, draft_id))

    @bp.put("/workspaces/<workspace_id>/appeal-drafts/<draft_id>")
    def edit_draft(workspace_id, draft_id):
        data = body()
        return jsonify(
            store.edit_draft(
                workspace_id,
                draft_id,
                data.get("expected_revision"),
                data.get("expected_version"),
                data.get("text"),
            )
        )

    return bp
