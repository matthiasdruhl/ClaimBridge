"""Bounded, metadata-only local event storage. Never raises into application work."""

import json
import logging
import sqlite3
import time
from uuid import uuid4


class EventStore:
    def __init__(self, root):
        self.path = root / "diagnostics.sqlite3"
        self.started = time.monotonic()

    def connect(self):
        db = sqlite3.connect(self.path, timeout=0.2)
        db.execute(
            "CREATE TABLE IF NOT EXISTS events "
            "(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE, timestamp REAL, "
            "source TEXT, severity TEXT, operation TEXT, request_id TEXT, status INTEGER, "
            "duration_ms REAL, outcome TEXT)"
        )
        return db

    def record(self, **event):
        record = dict(
            id=event.get("id", uuid4().hex),
            timestamp=time.time(),
            source=event.get("source", "backend"),
            severity=event.get("severity", "info"),
            operation=event.get("operation", "unknown"),
            request_id=event.get("request_id", ""),
            status=event.get("status"),
            duration_ms=event.get("duration_ms"),
            outcome=event.get("outcome", "completed"),
        )
        try:
            logging.getLogger("claimbridge.events").warning(json.dumps(record))
            with self.connect() as db:
                db.execute(
                    "INSERT OR IGNORE INTO events "
                    "(id,timestamp,source,severity,operation,request_id,"
                    "status,duration_ms,outcome) "
                    "VALUES (:id,:timestamp,:source,:severity,:operation,:request_id,:status,"
                    ":duration_ms,:outcome)",
                    record,
                )
                db.execute("DELETE FROM events WHERE timestamp < ?", (time.time() - 86400,))
                db.execute(
                    "DELETE FROM events WHERE seq NOT IN "
                    "(SELECT seq FROM events ORDER BY seq DESC LIMIT 10000)"
                )
        except Exception:
            pass  # Diagnostics must never interrupt claim processing.

    def read(self, after=0, source=None, severity=None, request_id=None):
        clauses, params = ["seq > ?", "timestamp >= ?"], [after, time.time() - 86400]
        for key, value in [("source", source), ("severity", severity), ("request_id", request_id)]:
            if value:
                clauses.append(f"{key} = ?")
                params.append(value)
        with self.connect() as db:
            db.row_factory = sqlite3.Row
            rows = db.execute(
                "SELECT * FROM events WHERE " + " AND ".join(clauses) + " ORDER BY seq LIMIT 200",
                params,
            ).fetchall()
        return [dict(row) for row in rows]

    def metrics(self):
        with self.connect() as db:
            row = db.execute(
                "SELECT COUNT(*), COALESCE(SUM(status >= 400),0) FROM events "
                "WHERE source='backend' AND operation LIKE 'http.%' AND timestamp >= ?",
                (time.time() - 900,),
            ).fetchone()
        return {"requests": row[0], "errors": row[1], "window_seconds": 900}
