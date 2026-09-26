"""Local SQLite storage; originals and extracted pages stay server-side."""

import json
import sqlite3
from pathlib import Path
from uuid import uuid4


class WorkspaceError(Exception):
    def __init__(self, message, status=400):
        self.status = status
        super().__init__(message)


class WorkspaceStore:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.path = self.root / "workspaces.sqlite3"
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT)")
            db.execute("CREATE TABLE IF NOT EXISTS originals (id TEXT PRIMARY KEY, body BLOB)")

    def connect(self):
        return sqlite3.connect(self.path)

    def create(self):
        state = {"id": uuid4().hex, "revision": 1, "status": "empty", "documents": []}
        with self.connect() as db:
            db.execute("INSERT INTO workspaces VALUES (?, ?)", (state["id"], json.dumps(state)))
        return state

    def get(self, workspace_id):
        with self.connect() as db:
            return self._get(db, workspace_id)

    def _get(self, db, workspace_id):
        row = db.execute("SELECT data FROM workspaces WHERE id=?", (workspace_id,)).fetchone()
        if not row:
            raise WorkspaceError("Workspace not found.", 404)
        return json.loads(row[0])

    def add(self, workspace_id, revision, document, pages, body):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            state = self._get(db, workspace_id)
            if state["revision"] != revision:
                raise WorkspaceError("Workspace changed. Refresh and try again.", 409)
            for existing in state["documents"]:
                if existing["document"]["sha256"] == document["sha256"]:
                    return state
            state["documents"].append({"document": document, "pages": pages})
            state["revision"] += 1
            state["status"] = "awaiting_analysis"
            db.execute("INSERT INTO originals VALUES (?, ?)", (document["id"], body))
            db.execute("UPDATE workspaces SET data=? WHERE id=?", (json.dumps(state), workspace_id))
        return state

    def original(self, workspace_id, document_id):
        state = self.get(workspace_id)
        if not any(item["document"]["id"] == document_id for item in state["documents"]):
            raise WorkspaceError("Document not found.", 404)
        with self.connect() as db:
            return db.execute("SELECT body FROM originals WHERE id=?", (document_id,)).fetchone()[0]
