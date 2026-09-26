"""Additive SQLite tables; atomic revision checks isolate jobs from changing inputs."""

import hashlib
import json
import time
from datetime import date
from uuid import uuid4

from claimbridge.infrastructure.workspaces import WorkspaceError


class AnalysisStore:
    def __init__(self, workspaces):
        self.workspaces = workspaces
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS processing_jobs (
                    id TEXT PRIMARY KEY, workspace_id TEXT, revision INTEGER,
                    fingerprint TEXT, status TEXT, stage TEXT, error TEXT,
                    retryable INTEGER, created REAL, updated REAL, payload TEXT);
                CREATE TABLE IF NOT EXISTS claim_revisions (
                    workspace_id TEXT, revision INTEGER, claim TEXT, action_plan TEXT,
                    metadata TEXT, PRIMARY KEY(workspace_id,revision));
                CREATE TABLE IF NOT EXISTS claim_evidence (
                    workspace_id TEXT, revision INTEGER, id TEXT, data TEXT,
                    PRIMARY KEY(workspace_id,revision,id));
                CREATE TABLE IF NOT EXISTS claim_answers (
                    workspace_id TEXT, revision INTEGER, question_id TEXT, data TEXT,
                    PRIMARY KEY(workspace_id,revision));
                CREATE TABLE IF NOT EXISTS appeal_drafts (
                    id TEXT PRIMARY KEY, workspace_id TEXT, revision INTEGER,
                    version INTEGER, data TEXT);
            """)
            db.execute(
                "UPDATE processing_jobs SET status='failed', stage='interrupted', "
                "error='PROCESS_INTERRUPTED', retryable=1 WHERE status IN ('queued','running')"
            )

    def connect(self):
        return self.workspaces.connect()

    def check(self, db, workspace_id, revision):
        state = self.workspaces._get(db, workspace_id)
        if type(revision) is not int or state["revision"] != revision:
            raise WorkspaceError("Workspace changed. Refresh and try again.", 409)
        return state

    def start(self, workspace_id, revision, document_ids, config, request_id):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self.check(db, workspace_id, revision)
            available = {item["document"]["id"]: item for item in state["documents"]}
            if (
                not isinstance(document_ids, list)
                or not document_ids
                or not all(isinstance(item, str) and item in available for item in document_ids)
                or len(set(document_ids)) != len(document_ids)
            ):
                raise WorkspaceError("Choose valid documents from this workspace.")
            documents = [available[key] for key in sorted(document_ids)]
            if any(item["document"]["status"] != "ready" for item in documents):
                raise WorkspaceError("Use readable, unlocked text PDFs before analysis.", 422)
            if sum(len(page["text"]) for item in documents for page in item["pages"]) > 180000:
                raise WorkspaceError("Selected text exceeds the local analysis limit.", 413)
            fingerprint = hashlib.sha256(
                json.dumps(
                    {
                        "revision": revision,
                        "config": config,
                        "documents": [
                            (item["document"]["id"], item["document"]["sha256"])
                            for item in documents
                        ],
                    },
                    sort_keys=True,
                ).encode()
            ).hexdigest()
            existing = db.execute(
                "SELECT id FROM processing_jobs WHERE workspace_id=? "
                "AND fingerprint=? AND status IN "
                "('queued','running','succeeded') ORDER BY created DESC",
                (workspace_id, fingerprint),
            ).fetchone()
            if existing:
                return self._job(db, existing[0]), False
            # A successful immutable snapshot must not be replaced at the same revision.
            if db.execute(
                "SELECT 1 FROM claim_revisions WHERE workspace_id=? AND revision=?",
                (workspace_id, revision),
            ).fetchone():
                raise WorkspaceError(
                    "This revision is already analyzed. Add new evidence to revise it.", 409
                )
            job_id, now = uuid4().hex, time.time()
            payload = dict(
                workspace=state,
                documents=documents,
                config=config,
                as_of=date.today().isoformat(),
                request_id=request_id,
            )
            db.execute(
                "INSERT INTO processing_jobs VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    job_id,
                    workspace_id,
                    revision,
                    fingerprint,
                    "queued",
                    "queued",
                    None,
                    0,
                    now,
                    now,
                    json.dumps(payload),
                ),
            )
            return self._job(db, job_id), True

    def _job(self, db, job_id):
        row = db.execute(
            "SELECT id,workspace_id,revision,status,stage,error,retryable,created,updated "
            "FROM processing_jobs WHERE id=?",
            (job_id,),
        ).fetchone()
        if row is None:
            raise WorkspaceError("Job not found.", 404)
        result = dict(
            zip(
                [
                    "job_id",
                    "workspace_id",
                    "revision",
                    "status",
                    "stage",
                    "error",
                    "retryable",
                    "created_at",
                    "updated_at",
                ],
                row,
                strict=True,
            )
        )
        result["retryable"] = bool(result["retryable"])
        return result

    def job(self, job_id):
        with self.connect() as db:
            return self._job(db, job_id)

    def payload(self, job_id):
        with self.connect() as db:
            row = db.execute("SELECT payload FROM processing_jobs WHERE id=?", (job_id,)).fetchone()
        return json.loads(row[0])

    def stage(self, job_id, stage, status="running", error=None, retryable=False):
        with self.connect() as db:
            db.execute(
                "UPDATE processing_jobs SET stage=?,status=?,error=?,retryable=?,updated=? "
                "WHERE id=?",
                (stage, status, error, int(retryable), time.time(), job_id),
            )

    def latest(self, workspace_id, revision=None):
        self.workspaces.get(workspace_id)
        with self.connect() as db:
            sql = (
                "SELECT revision,claim,action_plan,metadata FROM "
                "claim_revisions WHERE workspace_id=?"
            )
            params = [workspace_id]
            if revision is not None:
                sql += " AND revision=?"
                params.append(revision)
            row = db.execute(sql + " ORDER BY revision DESC LIMIT 1", params).fetchone()
        return (
            None
            if row is None
            else dict(
                revision=row[0],
                claim=json.loads(row[1]),
                action_plan=json.loads(row[2]),
                metadata=json.loads(row[3]),
            )
        )

    def save(self, job_id, claim, actions, metadata):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            job = self._job(db, job_id)
            state = self.workspaces._get(db, job["workspace_id"])
            if state["revision"] != job["revision"]:
                db.execute(
                    "UPDATE processing_jobs SET status='obsolete',stage='discarded',updated=? "
                    "WHERE id=?",
                    (time.time(), job_id),
                )
                return False
            if db.execute(
                "SELECT 1 FROM claim_revisions WHERE workspace_id=? AND revision=?",
                (state["id"], state["revision"]),
            ).fetchone():
                db.execute(
                    "UPDATE processing_jobs SET status='obsolete',stage='discarded' WHERE id=?",
                    (job_id,),
                )
                return False
            db.execute(
                "INSERT INTO claim_revisions VALUES (?,?,?,?,?)",
                (
                    state["id"],
                    state["revision"],
                    json.dumps(claim),
                    json.dumps(actions),
                    json.dumps(metadata),
                ),
            )
            for item in claim["evidence"]:
                db.execute(
                    "INSERT INTO claim_evidence VALUES (?,?,?,?)",
                    (state["id"], state["revision"], item["id"], json.dumps(item)),
                )
            state["status"] = "analyzed"
            db.execute("UPDATE workspaces SET data=? WHERE id=?", (json.dumps(state), state["id"]))
            db.execute(
                "UPDATE processing_jobs SET "
                "status='succeeded',stage='complete',updated=? WHERE id=?",
                (time.time(), job_id),
            )
            return True

    def answers(self, workspace_id):
        with self.connect() as db:
            rows = db.execute(
                "SELECT data FROM claim_answers WHERE workspace_id=? ORDER BY revision",
                (workspace_id,),
            ).fetchall()
        return [json.loads(row[0]) for row in rows]

    def answer(self, workspace_id, revision, question_id, answer, supporting):
        from datetime import date

        if question_id not in {"Q-location", "Q-receipt", "Q-payment"}:
            raise WorkspaceError("Question not found.", 404)
        if not isinstance(answer, str) or not answer.strip() or len(answer) > 2000:
            raise WorkspaceError("Provide an answer of 1–2,000 characters.")
        if question_id == "Q-receipt":
            try:
                parsed = date.fromisoformat(answer)
            except ValueError:
                raise WorkspaceError("Use a receipt date in YYYY-MM-DD format.") from None
            if parsed > date.today():
                raise WorkspaceError("Receipt date cannot be in the future.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self.check(db, workspace_id, revision)
            known = {item["document"]["id"] for item in state["documents"]}
            if not isinstance(supporting, list) or any(
                not isinstance(item, str) or item not in known for item in supporting
            ):
                raise WorkspaceError("Supporting documents must belong to this workspace.")
            state["revision"] += 1
            state["status"] = "awaiting_analysis"
            data = dict(
                id="U-" + uuid4().hex,
                question_id=question_id,
                answer=answer.strip(),
                supporting_document_ids=supporting,
                revision=state["revision"],
            )
            db.execute(
                "INSERT INTO claim_answers VALUES (?,?,?,?)",
                (workspace_id, state["revision"], question_id, json.dumps(data)),
            )
            db.execute("UPDATE workspaces SET data=? WHERE id=?", (json.dumps(state), workspace_id))
        return state

    def current(self, workspace_id, revision):
        state = self.workspaces.get(workspace_id)
        if type(revision) is not int or state["revision"] != revision:
            raise WorkspaceError("Workspace changed. Refresh and try again.", 409)
        result = self.latest(workspace_id, revision)
        if result is None:
            raise WorkspaceError(
                "Analyze the current workspace before generating actions or drafts.", 409
            )
        return result

    def create_draft(self, workspace_id, revision, draft):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            self.check(db, workspace_id, revision)
            draft.update(draft_id=uuid4().hex, revision=revision, version=1, submitted=False)
            db.execute(
                "INSERT INTO appeal_drafts VALUES (?,?,?,?,?)",
                (draft["draft_id"], workspace_id, revision, 1, json.dumps(draft)),
            )
        return draft

    def draft(self, workspace_id, draft_id):
        state = self.workspaces.get(workspace_id)
        with self.connect() as db:
            row = db.execute(
                "SELECT data FROM appeal_drafts WHERE id=? AND workspace_id=?",
                (draft_id, workspace_id),
            ).fetchone()
        if row is None:
            raise WorkspaceError("Draft not found.", 404)
        draft = json.loads(row[0])
        draft["stale"] = state["revision"] != draft["revision"]
        return draft

    def edit_draft(self, workspace_id, draft_id, revision, version, text):
        if not isinstance(text, str) or not text.strip() or len(text) > 50000:
            raise WorkspaceError("Draft text must contain 1–50,000 characters.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            self.check(db, workspace_id, revision)
            row = db.execute(
                "SELECT data FROM appeal_drafts WHERE id=? AND workspace_id=?",
                (draft_id, workspace_id),
            ).fetchone()
            if row is None:
                raise WorkspaceError("Draft not found.", 404)
            draft = json.loads(row[0])
            if draft["revision"] != revision or draft["version"] != version:
                raise WorkspaceError("Draft is stale. Reload or regenerate it.", 409)
            draft.update(text=text, version=version + 1, user_edited=True)
            db.execute(
                "UPDATE appeal_drafts SET data=?,version=? WHERE id=?",
                (json.dumps(draft), version + 1, draft_id),
            )
        return draft
