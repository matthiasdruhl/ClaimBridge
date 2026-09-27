"""Bounded, evidence-dependent reasoning for two denial categories; never adjudicates."""

import copy
import hashlib
from datetime import date, timedelta

from claimbridge.domain.contracts import fact, unknown, validate


def value(item, key):
    return item.get(key, {}).get("value")


def refs(*facts):
    return list(dict.fromkeys(ref for item in facts for ref in item.get("evidence_ids", [])))


def apply_answers(claim, answers):
    latest = {item["question_id"]: item for item in answers}
    claim["evidence"] = [item for item in claim["evidence"] if item["domain"] != "user_answer"]
    for question, answer in latest.items():
        text = answer["answer"]
        claim["evidence"].append(
            dict(
                id=answer["id"],
                domain="user_answer",
                kind="answer",
                document_id=None,
                source_id=None,
                source_url=None,
                location=dict(
                    page=None, section=question, start_char=None, end_char=None, bbox=None
                ),
                text=text,
                text_kind="user_statement",
                content_sha256=hashlib.sha256(text.encode()).hexdigest(),
                verification="unverified",
                authority_scope="User report, not document verification",
                accessed_at=None,
            )
        )
        if question == "Q-receipt":
            prior = claim["denial"]["received_date"]
            if prior["status"] == "explicit" and prior["value"] not in (None, text):
                claim["denial"]["received_date"] = fact(
                    None,
                    refs(prior) + [answer["id"]],
                    "conflicted",
                    "Document receipt and user report disagree",
                )
            else:
                claim["denial"]["received_date"] = fact(text, [answer["id"]], "user_reported")
        if question == "Q-location" and text in {"asc", "office", "hospital"}:
            disputed = value(claim["denial"], "claim_id") or claim["id"]
            matching = [item for item in claim["eobs"] if value(item, "claim_id") == disputed]
            for service in claim["services"]:
                if len(matching) != 1 or service["id"] != matching[0]["service_id"]:
                    continue
                prior = service["actual_setting"]
                if prior["status"] == "explicit" and prior["value"] != text:
                    service["actual_setting"] = fact(
                        None,
                        refs(prior) + [answer["id"]],
                        "conflicted",
                        "Documented setting and user report disagree",
                    )
                elif prior["status"] != "explicit":
                    service["actual_setting"] = fact(
                        text,
                        refs(prior) + [answer["id"]],
                        "user_reported",
                        "User-reported setting still needs documentary corroboration",
                    )
    return latest


def analyze(claim, answers, plan_ids):
    claim = copy.deepcopy(claim)
    latest = apply_answers(claim, answers)
    claim["conclusions"], claim["questions"] = [], []
    claim["corrected_liability_cents"] = unknown(
        "Recognized amount and final adjudication remain unresolved"
    )
    denial = claim["denial"]
    denial["deadline"] = unknown("A supported receipt date and calendar-day plan rule are required")
    evidence = {item["id"]: item for item in claim["evidence"]}
    plan_text = " ".join(evidence[item]["text"] for item in plan_ids).lower()
    supporting = refs(denial["reason"], denial["type"])
    disputed_id = value(denial, "claim_id") or claim["id"]
    eobs = [item for item in claim["eobs"] if value(item, "claim_id") == disputed_id]
    service = next(
        (
            item
            for item in claim["services"]
            if len(eobs) == 1 and item["id"] == eobs[0]["service_id"]
        ),
        None,
    )
    provider = next(
        (item for item in claim["providers"] if service and item["id"] == service["provider_id"]),
        None,
    )
    facility = next(
        (
            item
            for item in claim["providers"]
            if service and item["id"] == value(service, "facility_id")
        ),
        None,
    )
    scope = (
        value(claim["plan"], "coverage_active") is True
        and value(claim["plan"], "erisa") is True
        and value(claim["plan"], "funding") == "self_funded"
    )
    facility_supported = False

    def conclusion(identifier, text, classification, outcome, ids, unresolved):
        if ids:
            claim["conclusions"].append(
                dict(
                    id=identifier,
                    text=text,
                    classification=classification,
                    outcome=outcome,
                    evidence_ids=list(dict.fromkeys(ids)),
                    unresolved=unresolved,
                )
            )

    def question(identifier, prompt, why, path, ids, blockers, resolved=False):
        answer = latest.get(identifier)
        claim["questions"].append(
            dict(
                id=identifier,
                prompt=prompt,
                why=why,
                target_fact_path=path,
                status="answered" if answer else "resolved_by_document" if resolved else "open",
                answer=answer["answer"] if answer else None,
                evidence_ids=([answer["id"]] if answer else ids),
                blocking_for=blockers,
            )
        )

    kind = value(denial, "type")
    if supporting:
        conclusion(
            "denial",
            "The notice states: " + str(value(denial, "reason") or "reason needs review"),
            "fact",
            "possible_coverage_dispute",
            supporting,
            [],
        )
    if kind == "network" and service:
        setting = value(service, "actual_setting")
        ids = supporting + refs(
            service["submitted_pos"], service["actual_setting"], service["facility_id"]
        )
        if facility:
            ids += refs(facility["network"])
        if provider:
            ids += refs(provider["network"])
        facility_supported = bool(
            scope
            and value(claim["plan"], "grandfathered") is False
            and setting in {"asc", "hospital"}
            and service["actual_setting"]["status"] == "explicit"
            and facility
            and value(facility, "network") == "in"
            and facility["network"]["status"] == "explicit"
            and provider
            and provider["role"] == "anesthesia"
            and value(provider, "network") == "out"
            and "anesthes" in plan_text
            and "participating" in plan_text
            and "cost sharing" in plan_text
            and ("except" in plan_text or "protected" in plan_text)
        )
        if facility_supported:
            conclusion(
                "network-location",
                "The documented service setting and participating facility "
                "support asking the plan to review its facility exception "
                "and reprocess the disputed "
                "claim if applicable. The records do not establish who "
                "caused the discrepancy or the "
                "final amount owed.",
                "interpretation",
                "possible_processing_error",
                ids + plan_ids,
                ["Submitted/corrected claim records", "Recognized amount", "Final adjudication"],
            )
        elif setting == "office" and service["actual_setting"]["status"] == "explicit":
            conclusion(
                "network-location",
                "The encounter documents an office service. A qualifying "
                "facility exception is not established. The network "
                "exclusion may have been applied "
                "correctly; request the claim records and review any other applicable exception.",
                "conditional",
                "likely_correct",
                ids + plan_ids,
                ["Complete plan terms and any other exceptions"],
            )
        else:
            conclusion(
                "network-location",
                "The current records do not establish every condition "
                "for the facility exception. Compare the submitted location "
                "with the actual encounter "
                "and service-date network records. Authorization alone does not prove attendance "
                "or guarantee payment.",
                "conditional",
                "missing_information",
                ids + plan_ids,
                [
                    "Actual service setting",
                    "Service-date facility participation",
                    "Applicable plan scope",
                ],
            )
        question(
            "Q-location",
            "Where did the disputed service occur? Add the encounter and network record.",
            "A user report is retained separately; supporting documents "
            "must establish the setting.",
            "services.actual_setting",
            ids,
            ["facility_exception"],
            facility_supported or setting == "office",
        )
    elif kind == "authorization" and service:
        matches, mismatches = [], []
        for authorization in claim["authorizations"]:
            fields = [
                authorization.get(key, unknown())
                for key in ("start", "end", "provider_id", "service_code")
            ]
            service_date, code = value(service, "date"), value(service, "code")
            if not service_date or not code or any(item["value"] is None for item in fields):
                continue
            supported = all(item["status"] == "explicit" for item in fields)
            same = (
                fields[0]["value"] <= service_date <= fields[1]["value"]
                and fields[2]["value"] == service["provider_id"]
                and fields[3]["value"] == code
            )
            (matches if same and supported else mismatches).append(authorization)
        ids = supporting + refs(service["date"], service["code"])
        for authorization in claim["authorizations"]:
            ids += refs(*authorization.values())
        if len(matches) == 1 and not mismatches and scope and "authoriz" in plan_text:
            conclusion(
                "authorization",
                "An authorization matches the documented service code, provider "
                "and date. Ask the plan to reconcile the denial with that authorization and review "
                "whether correction or reprocessing is appropriate. Approval "
                "does not guarantee payment.",
                "interpretation",
                "possible_processing_error",
                ids + plan_ids,
                ["Other authorization conditions", "Submitted claim fields", "Final adjudication"],
            )
        else:
            conclusion(
                "authorization",
                "A complete authorization match is not established or the "
                "records conflict. Compare provider, service code, validity "
                "dates and plan conditions "
                "before making an appeal argument.",
                "conditional",
                "missing_information",
                ids + plan_ids,
                ["Matching authorization and plan scope"],
            )
    else:
        conclusion(
            "scope",
            "This denial or its claim identity is outside the currently supported "
            "analysis. Review the cited facts with the plan or a "
            "qualified reviewer before selecting "
            "an appeal strategy.",
            "unknown",
            "requires_escalation",
            supporting,
            ["Supported denial category and claim identity"],
        )

    received = value(denial, "received_date")
    days = value(claim["plan"], "appeal_days")
    trigger = value(claim["plan"], "appeal_trigger")
    if received and days and trigger == "receipt_calendar_days":
        receipt = date.fromisoformat(received)
        notice = value(denial, "notice_date")
        if receipt <= date.today() and (not notice or receipt >= date.fromisoformat(notice)):
            deadline = (receipt + timedelta(days=days)).isoformat()
            denial["deadline"] = fact(
                deadline,
                refs(
                    denial["received_date"],
                    claim["plan"]["appeal_days"],
                    claim["plan"]["appeal_trigger"],
                ),
                "derived",
                "Calculated from the extracted plan convention and receipt source; submit early.",
                {
                    "method": "receipt date + plan calendar days; excludes receipt date",
                    "input_fact_paths": [
                        "denial.received_date",
                        "plan.appeal_days",
                        "plan.appeal_trigger",
                    ],
                },
            )
    question(
        "Q-receipt",
        "When did you first receive the denial?",
        "Needed for a supported filing date.",
        "denial.received_date",
        refs(denial["notice_date"]),
        ["deadline"],
        received is not None,
    )
    question(
        "Q-payment",
        "Have you made payments or received newer bills/EOBs?",
        "The displayed balance is a statement snapshot. Upload newer records to update it.",
        "bills",
        [],
        ["current_balance"],
    )
    # Report inconsistency without repairing or merging accounting fields.
    for eob in claim["eobs"]:
        finance = eob["financial"]
        amounts = [
            value(finance, key)
            for key in ("billed_cents", "paid_cents", "member_cents", "adjustment_cents")
        ]
        if all(amount is not None for amount in amounts) and amounts[0] != sum(amounts[1:]):
            conclusion(
                "finance-" + eob["id"],
                "This EOB's billed, paid, member and adjustment "
                "amounts do not reconcile. Confirm the source before relying on its accounting.",
                "conditional",
                "missing_information",
                refs(*finance.values()),
                ["Reconciled EOB amounts"],
            )
    return claim, facility_supported


def action_plan(claim):
    evidence_ids = refs(claim["denial"]["reason"])
    actions, arguments = [], []
    for conclusion in claim["conclusions"]:
        if conclusion["id"] not in {"network-location", "authorization"}:
            continue
        arguments.append(
            dict(
                id="ARG-" + conclusion["id"],
                statement=conclusion["text"],
                evidence_ids=conclusion["evidence_ids"],
                limitations=conclusion["unresolved"],
                requested_remedy="Review the cited records, provide the claim file, and "
                "reprocess if supported.",
            )
        )
    if evidence_ids:
        for identifier, owner, title, instructions in [
            (
                "records",
                "member",
                "Request the claim records",
                "Ask the plan for submitted claim fields, "
                "the applicable provisions and its explanation. Ask the "
                "provider to compare the actual "
                "service record and submit an accurate correction if appropriate.",
            ),
            (
                "balance",
                "member",
                "Confirm the current balance",
                "Request an itemized ledger and any "
                "newer EOB. Ask for a temporary billing hold; do not assume it has been granted.",
            ),
            (
                "appeal",
                "member",
                "Preserve appeal rights",
                "Verify the plan's actual appeal instructions, "
                "submit early if disputing the decision, and retain proof. A "
                "correction request does not "
                "establish an extension. Further review depends on the final "
                "notice and eligibility.",
            ),
        ]:
            actions.append(
                dict(
                    id=identifier,
                    owner=owner,
                    title=title,
                    instructions=instructions,
                    status="suggested",
                    due=claim["denial"]["deadline"] if identifier == "appeal" else unknown(),
                    depends_on=[],
                    evidence_ids=evidence_ids,
                    completion_evidence_ids=[],
                )
            )
    result = dict(
        claim_id=claim["id"],
        claim_revision=claim["revision"],
        status="needs_information"
        if any(item["status"] == "open" for item in claim["questions"])
        else "ready_for_review",
        actions=actions,
        arguments=arguments,
        submitted=False,
    )
    validate("action-plan", result)
    return result


def evidence_reference(evidence):
    labels = {
        "policy": "Plan document",
        "eob": "Explanation of Benefits",
        "denial": "Denial notice",
        "bill": "Provider bill",
        "authorization": "Authorization",
        "correspondence": "Supporting correspondence",
        "government_guidance": "Government guidance",
        "regulation": "Federal regulation",
        "source_summary": "External source summary",
        "answer": "User-provided answer",
    }
    label = labels.get(evidence["kind"], "Supporting source")
    page = evidence["location"]["page"]
    locator = f" · page {page}" if page is not None else ""
    return f"{label}{locator} [{evidence['id']}]"


def draft_text(claim, actions):
    arguments = actions["arguments"]
    evidence = {item["id"]: item for item in claim["evidence"]}
    text = [
        "DRAFT — NOT SUBMITTED — REVIEW BEFORE USE",
        "",
        "To: [verified plan appeal address]",
        f"Member: {value(claim['patient'], 'name') or '[member name]'}",
        f"Member ID: {value(claim['patient'], 'member_id') or '[member ID]'}",
        f"Claim: {value(claim['denial'], 'claim_id') or claim['id']}",
        "",
        "I request review of the adverse determination and access to the relevant claim records.",
    ]
    for argument in arguments:
        sources = [
            evidence_reference(evidence[item]) if item in evidence else f"Source [{item}]"
            for item in argument["evidence_ids"]
        ]
        text += [
            "",
            argument["statement"],
            "Supporting sources: " + "; ".join(sources),
            "Unresolved: " + "; ".join(argument["limitations"]),
            argument["requested_remedy"],
        ]
    text += [
        "",
        "Please provide a written explanation and corrected accounting if reprocessing is "
        "appropriate. The final amount owed has not been established.",
        "",
        "[Your signature]",
        "[Date]",
    ]
    return dict(
        text="\n".join(text),
        evidence_ids=list(
            dict.fromkeys(item for argument in arguments for item in argument["evidence_ids"])
        ),
        attachments=list(
            dict.fromkeys(item["document_id"] for item in claim["evidence"] if item["document_id"])
        ),
        unresolved_fields=["verified appeal destination", "signature", "final adjudication"],
        user_edited=False,
    )
