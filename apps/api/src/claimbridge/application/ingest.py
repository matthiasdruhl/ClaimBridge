"""Extract source pages without claiming model-derived facts or coverage conclusions."""

from hashlib import sha256
from io import BytesIO
from uuid import uuid4

from pypdf import PdfReader
from werkzeug.utils import secure_filename

from claimbridge.infrastructure.workspaces import WorkspaceError


def ingest(store, workspace_id, revision, filename, body):
    store.get(workspace_id)
    if not body.startswith(b"%PDF-"):
        raise WorkspaceError("Upload a valid PDF document.", 415)
    document_id = uuid4().hex
    pages = []
    status, error = "ready", None
    count = None
    try:
        reader = PdfReader(BytesIO(body))
        if reader.is_encrypted:
            status, error = "encrypted", "PDF_ENCRYPTED"
        else:
            count = len(reader.pages)
            if not 1 <= count <= 100:
                raise WorkspaceError("PDFs must contain 1–100 pages.", 422)
            for number, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ""
                pages.append({"page": number, "text": text, "id": f"{document_id}:p{number}"})
            if any(not page["text"].strip() for page in pages):
                status, error = "needs_ocr", "PDF_TEXT_MISSING"
    except WorkspaceError:
        raise
    except Exception:
        raise WorkspaceError("This PDF could not be read. Try another copy.", 422) from None
    document = {
        "id": document_id,
        "workspace_id": workspace_id,
        "filename": secure_filename(filename) or "document.pdf",
        "sha256": sha256(body).hexdigest(),
        "mime": "application/pdf",
        "kind": "unknown",
        "synthetic": True,
        "status": status,
        "pages": count,
        "error_code": error,
        "extraction_version": "pypdf-6.19.0",
    }
    return store.add(workspace_id, revision, document, pages, body)
