"""Structural and provenance checks; quotation matching is not semantic entailment."""

import copy
import hashlib
import re
from datetime import date

from claimbridge.domain.contracts import ValidationFailure, unknown, validate, walk_facts


def normalize(text):
    return " ".join(text.split())


def match_span(page, quote):
    # Map collapsed whitespace positions back to the extracted page for reliable offsets.
    chars, offsets = [], []
    for match in re.finditer(r"\S+", page):
        if chars:
            chars.append(" ")
            offsets.append(match.start())
        chars.extend(match.group())
        offsets.extend(range(match.start(), match.end()))
    needle = normalize(quote)
    start = "".join(chars).find(needle)
    if len(needle) < 8 or start < 0:
        raise ValidationFailure("EVIDENCE_QUOTE_NOT_FOUND")
    return offsets[start], offsets[start + len(needle) - 1] + 1


def validate_extraction(candidate, workspace, documents, as_of):
    claim = copy.deepcopy(candidate)
    if not isinstance(claim, dict):
        raise ValidationFailure("SCHEMA_INVALID")
    claim.update(revision=workspace["revision"], as_of=as_of, synthetic=True)
    claim["conclusions"], claim["questions"] = [], []
    claim["corrected_liability_cents"] = unknown("Final adjudication is not established")
    if isinstance(claim.get("denial"), dict):
        claim["denial"]["deadline"] = unknown("Receipt date and applicable rule required")
    validate("claim", claim)
    pages = {
        (item["document"]["id"], page["page"]): page["text"]
        for item in documents
        for page in item["pages"]
    }
    evidence = {}
    for item in claim["evidence"]:
        if item["domain"] not in {"user", "plan"} or item["id"] in evidence:
            raise ValidationFailure("EVIDENCE_DOMAIN_OR_ID_INVALID")
        page = pages.get((item["document_id"], item["location"]["page"]))
        if page is None:
            raise ValidationFailure("EVIDENCE_PAGE_INVALID")
        if item["domain"] == "plan" and item["kind"] != "policy":
            raise ValidationFailure("PLAN_EVIDENCE_INVALID")
        start, end = match_span(page, item["text"])
        item.update(
            text=page[start:end],
            text_kind="verbatim",
            verification="exact_match",
            source_id=None,
            source_url=None,
            accessed_at=None,
            authority_scope="Uploaded synthetic document statement; not independently verified",
        )
        item["content_sha256"] = hashlib.sha256(item["text"].encode()).hexdigest()
        item["location"].update(start_char=start, end_char=end, bbox=None)
        evidence[item["id"]] = item
    for path, item in walk_facts(claim):
        if item["status"] not in {"explicit", "unknown", "conflicted"}:
            raise ValidationFailure("MODEL_FACT_STATUS_INVALID")
        if item["status"] == "unknown" and (item["value"] is not None or not item["reason"]):
            raise ValidationFailure("UNKNOWN_FACT_INVALID")
        if item["status"] == "conflicted" and item["value"] is not None:
            raise ValidationFailure("CONFLICT_MUST_REMAIN_UNRESOLVED")
        if item["status"] == "explicit" and item["value"] is None:
            raise ValidationFailure("KNOWN_FACT_NULL")
        if item["status"] != "unknown" and not item["evidence_ids"]:
            raise ValidationFailure("FACT_MISSING_EVIDENCE")
        if any(ref not in evidence for ref in item["evidence_ids"]):
            raise ValidationFailure("FACT_REFERENCE_INVALID")
        if (
            path.startswith("plan.")
            and item["value"] is not None
            and any(evidence[ref]["domain"] != "plan" for ref in item["evidence_ids"])
        ):
            raise ValidationFailure("PLAN_FACT_REQUIRES_PLAN_EVIDENCE")
        if item["derivation"] is not None:
            raise ValidationFailure("MODEL_DERIVATION_FORBIDDEN")
        if item["value"] is not None and path.endswith("_cents"):
            amount = item["value"]
            quoted = normalize(" ".join(evidence[ref]["text"] for ref in item["evidence_ids"]))
            tokens = re.findall(r"(?<![\w.])\$?\d+(?:,\d{3})*(?:\.\d{1,2})?(?![\w,])", quoted)
            from decimal import Decimal

            if not any(
                Decimal(token.replace("$", "").replace(",", "")) * 100 == amount for token in tokens
            ):
                raise ValidationFailure("MONEY_NOT_IN_SOURCE")
    for provision in claim["policy_provisions"]:
        if not provision["evidence_ids"] or any(
            ref not in evidence or evidence[ref]["domain"] != "plan"
            for ref in provision["evidence_ids"]
        ):
            raise ValidationFailure("POLICY_REFERENCE_INVALID")
    providers = {item["id"] for item in claim["providers"]}
    services = {item["id"] for item in claim["services"]}
    if len(providers) != len(claim["providers"]) or len(services) != len(claim["services"]):
        raise ValidationFailure("DUPLICATE_ENTITY_ID")
    if any(item["provider_id"] not in providers for item in claim["services"]):
        raise ValidationFailure("PROVIDER_REFERENCE_INVALID")
    if any(item["service_id"] not in services for item in claim["eobs"]):
        raise ValidationFailure("SERVICE_REFERENCE_INVALID")
    known_claims = [
        item["claim_id"]["value"] for item in claim["eobs"] if item["claim_id"]["value"] is not None
    ]
    if len(set(known_claims)) != len(known_claims):
        raise ValidationFailure("MULTIPLE_ADJUDICATIONS_NEED_REVIEW")
    member_ids = claim["patient"]["member_id"]
    if member_ids["status"] == "conflicted":
        raise ValidationFailure("MIXED_MEMBER_RECORDS")
    # Calendar parsing is also enforced by canonical formats.
    date.fromisoformat(claim["as_of"])
    validate("claim", claim)
    return claim
