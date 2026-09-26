"""Local plan FTS and explicitly allowlisted, scope-filtered source summaries."""

import hashlib
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]


def plan_retrieval(claim):
    passages = [item for item in claim["evidence"] if item["domain"] == "plan"]
    if not passages:
        return []
    with sqlite3.connect(":memory:") as db:
        db.execute("CREATE VIRTUAL TABLE passages USING fts5(id UNINDEXED, text)")
        db.executemany(
            "INSERT INTO passages VALUES (?,?)", [(item["id"], item["text"]) for item in passages]
        )
        rows = db.execute(
            "SELECT id FROM passages WHERE passages MATCH ? ORDER BY rank LIMIT 12",
            ("network OR exclusion OR exception OR authorization OR appeal",),
        ).fetchall()
    chosen = {row[0] for row in rows}
    # Expand cross-references to cited sections, then retain exclusion/exception pairs.
    sections = {item["id"]: item["location"]["section"] for item in passages}
    for _ in range(3):
        text = " ".join(item["text"] for item in passages if item["id"] in chosen)
        targets = re.findall(r"[Ss]ection\s+(\d+)\b", text)
        chosen.update(
            key
            for key, heading in sections.items()
            if any(re.search(rf"\b{target}\b", heading) for target in targets)
        )
    for item in passages:
        if re.search(r"exclu|except|protected facility|authoriz|appeal", item["text"], re.I):
            chosen.add(item["id"])
    return [item["id"] for item in passages if item["id"] in chosen]


def external_sources(claim, facility_supported):
    plan = claim["plan"]

    def value(key):
        return plan.get(key, {}).get("value")

    if not (
        value("erisa") is True
        and value("funding") == "self_funded"
        and value("coverage_active") is True
    ):
        return []
    allowed = {"R01"}
    if facility_supported and value("grandfathered") is False:
        allowed.update({"R02", "R03"})
    sources = json.loads((ROOT / "claimbridge-prep/research/sources.json").read_text())
    result = []
    for source in sources:
        if source["id"] not in allowed or source["verification"] != "opened_primary_source":
            continue
        text = source["verified_summary"]
        result.append(
            dict(
                id=source["id"],
                domain="external",
                kind="source_summary",
                document_id=None,
                source_id=source["id"],
                source_url=source["url"],
                location=dict(
                    page=None, section=source["locator"], start_char=None, end_char=None, bbox=None
                ),
                text=text,
                text_kind="verified_paraphrase",
                content_sha256=hashlib.sha256(text.encode()).hexdigest(),
                verification="human_reviewed",
                authority_scope=source["jurisdiction"],
                accessed_at=source["accessed_date"],
            )
        )
    return result
