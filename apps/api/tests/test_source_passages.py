"""Source references preserve complete exact passages without model-authored quotations."""

import pytest

from claimbridge.domain.contracts import ValidationFailure, extraction_schema
from claimbridge.infrastructure.source_passages import hydrate_evidence, source_passages


def test_passages_keep_page_offsets_and_distinct_sections():
    text = (
        "Header\nP7 | Exclusion\nExcluded unless Section 8 applies.\n"
        "P8 | Exception\nProtected cost sharing.\n"
    )
    documents = [dict(document=dict(id="uploaded", sha256="abc"), pages=[dict(page=3, text=text)])]
    catalog, inputs = source_passages(documents)
    assert len(catalog) == 3
    assert inputs[0]["pages"][0]["passages"][2]["id"] == "D1-P3-S3"
    hydrated = hydrate_evidence(
        {"evidence": [dict(id="D1-P3-S3", domain="plan", kind="policy")]}, catalog
    )
    evidence = hydrated["evidence"][0]
    assert evidence["text"] == "P8 | Exception\nProtected cost sharing.\n"
    assert (
        text[evidence["location"]["start_char"] : evidence["location"]["end_char"]]
        == evidence["text"]
    )
    assert evidence["document_id"] == "uploaded"
    schema = extraction_schema(catalog)
    assert schema["properties"]["evidence"]["items"]["properties"]["id"]["enum"] == list(catalog)


def test_unlabeled_page_and_foreign_reference():
    catalog, _ = source_passages(
        [
            dict(
                document=dict(id="doc", sha256="abc"),
                pages=[dict(page=1, text="Complete unlabelled page.")],
            )
        ]
    )
    assert len(catalog) == 1
    with pytest.raises(ValidationFailure, match="SOURCE_REFERENCE_INVALID"):
        hydrate_evidence({"evidence": [dict(id="invented", domain="user", kind="eob")]}, catalog)
