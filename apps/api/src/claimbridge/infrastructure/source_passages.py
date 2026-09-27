"""Number immutable source passages so extraction selects citations instead of rewriting them."""

import copy
import hashlib
import re

from claimbridge.domain.contracts import ValidationFailure


def source_passages(documents):
    catalog, inputs = {}, []
    for document_index, document in enumerate(documents, 1):
        pages = []
        for page in document["pages"]:
            text = page["text"]
            # Preserve entire labeled sections. Unlabeled pages remain a complete page passage.
            starts = [
                match.start()
                for match in re.finditer(r"(?m)^[A-Za-z][A-Za-z0-9.-]{0,24}\s*\|[^\n]+", text)
            ]
            boundaries = sorted({0, *starts, len(text)})
            passages = []
            for index, (start, end) in enumerate(zip(boundaries, boundaries[1:], strict=False), 1):
                passage = text[start:end]
                if not passage.strip():
                    continue
                identifier = f"D{document_index}-P{page['page']}-S{index}"
                catalog[identifier] = dict(
                    id=identifier,
                    document_id=document["document"]["id"],
                    source_id=None,
                    source_url=None,
                    location=dict(
                        page=page["page"],
                        section=passage.splitlines()[0][:160],
                        start_char=start,
                        end_char=end,
                        bbox=None,
                    ),
                    text=passage,
                    text_kind="verbatim",
                    content_sha256=hashlib.sha256(passage.encode()).hexdigest(),
                    verification="exact_match",
                    accessed_at=None,
                    authority_scope="Uploaded synthetic document statement; "
                    "not independently verified",
                )
                passages.append(dict(id=identifier, text=passage))
            pages.append(dict(page=page["page"], passages=passages))
        inputs.append(
            dict(
                document_id=document["document"]["id"],
                immutable_hash=document["document"]["sha256"],
                pages=pages,
            )
        )
    return catalog, inputs


def hydrate_evidence(candidate, catalog):
    result = copy.deepcopy(candidate)
    if not isinstance(result, dict) or not isinstance(result.get("evidence"), list):
        raise ValidationFailure("SCHEMA_INVALID")
    for index, item in enumerate(result["evidence"]):
        if not isinstance(item, dict):
            raise ValidationFailure("SCHEMA_INVALID")
        # Full evidence objects still undergo the existing exact-page validator. This supports
        # canonical callers; the live response schema only permits the short reference shape.
        if "text" in item:
            continue
        if item.get("id") not in catalog or set(item) != {"id", "domain", "kind"}:
            raise ValidationFailure(f"SOURCE_REFERENCE_INVALID_AT_INDEX_{index}")
        result["evidence"][index] = {**catalog[item["id"]], **item}
    return result
