"""Explicit TEST-ONLY browser harness. Never imported by production.

Runs on localhost:5001 with isolated /tmp data and a visible TEST DATA result badge.
"""
import hashlib
import json
import tempfile
from pathlib import Path

from claimbridge import create_app
from test_analysis import PREP, TestProvider, candidate


class BrowserTestProvider(TestProvider):
    def extract(self, messages, schema, validator):
        data = json.loads(messages[1]["content"])
        by_hash = {item["immutable_hash"]: item for item in data["documents"]}
        ordered = []
        for path in sorted((PREP / "demo-case/documents").glob("*.pdf")):
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in by_hash:
                item = by_hash[digest]
                ordered.append(dict(document={"id": item["document_id"]}, pages=item["pages"]))
        if len(ordered) not in {5, 6}:
            raise RuntimeError("Test harness requires the original five or six PDFs")
        return validator(candidate(ordered, clarified=len(ordered) == 6))


app = create_app({"DATA_DIR": Path(tempfile.mkdtemp(prefix="claimbridge-browser-test-")),
                  "MODEL_PROVIDER": BrowserTestProvider(), "DIAGNOSTICS_ENABLED": True})
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001)
