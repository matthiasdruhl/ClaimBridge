"""Evaluation-only assertions; never imported by application or sent to the provider."""


def original_gates(claim, clarified):
    checks = {}

    def check(name, actual, expected):
        checks[name] = {
            "passed": actual == expected,
            "actual": actual,
            "expected": expected,
        }

    check("claim_identity", claim["id"], "SYN-C260812-A")
    check("member_identity", claim["patient"]["member_id"]["value"], "SYN-M1042")
    check("denial_category", claim["denial"]["type"]["value"], "network")
    for field, expected in {
        "funding": "self_funded",
        "erisa": True,
        "grandfathered": False,
        "coverage_active": True,
        "appeal_days": 180,
        "appeal_trigger": "receipt_calendar_days",
    }.items():
        check("plan_" + field, claim["plan"][field]["value"], expected)
    eobs = {item["claim_id"]["value"]: item for item in claim["eobs"]}
    check("separate_claims", sorted(eobs, key=str), ["SYN-C260812-A", "SYN-C260812-F"])
    expected_finances = {
        "SYN-C260812-A": {
            "billed_cents": 420000,
            "allowed_cents": None,
            "paid_cents": 0,
            "member_cents": 420000,
            "adjustment_cents": 0,
        },
        "SYN-C260812-F": {
            "billed_cents": 1200000,
            "allowed_cents": 600000,
            "paid_cents": 480000,
            "member_cents": 120000,
            "adjustment_cents": 600000,
        },
    }
    for identifier, fields in expected_finances.items():
        for field, expected in fields.items():
            actual = (
                eobs.get(identifier, {})
                .get("financial", {})
                .get(field, {})
                .get("value")
            )
            check(identifier + ":" + field, actual, expected)
    disputed = eobs.get("SYN-C260812-A", {})
    service = next(
        (
            item
            for item in claim["services"]
            if item["id"] == disputed.get("service_id")
        ),
        {},
    )
    for field, expected in {
        "date": "2026-08-12",
        "submitted_pos": "11",
        "actual_setting": "asc" if clarified else None,
    }.items():
        check("service_" + field, service.get(field, {}).get("value"), expected)
    bills = [
        item for item in claim["bills"] if item["claim_id"]["value"] == "SYN-C260812-A"
    ]
    check("bill_count", len(bills), 1)
    if bills:
        check("bill_balance", bills[0]["balance_cents"]["value"], 420000)
    ids = {item["id"] for item in claim["evidence"]}
    check("facility_source_scope", {"R02", "R03"} <= ids, clarified)
    return checks


def packet_gates(claim, expected):
    """Compare critical source facts; expected data stays in the evaluation process only."""
    checks = {}

    def check(name, actual, wanted):
        checks[name] = {
            "passed": actual == wanted,
            "actual": actual,
            "expected": wanted,
        }

    check("claim_identity", claim["id"], expected["id"])
    check(
        "member_identity",
        claim["patient"]["member_id"]["value"],
        expected["patient"]["member_id"]["value"],
    )
    for field in ("claim_id", "type", "notice_date", "reason_code"):
        check(
            "denial_" + field,
            claim["denial"][field]["value"],
            expected["denial"][field]["value"],
        )
    check("eob_count", len(claim["eobs"]), len(expected["eobs"]))
    for eob in expected["eobs"]:
        actual = next(
            (
                item
                for item in claim["eobs"]
                if item["claim_id"]["value"] == eob["claim_id"]["value"]
            ),
            {},
        )
        for field, fact in eob["financial"].items():
            check(
                "finance_" + field,
                actual.get("financial", {}).get(field, {}).get("value"),
                fact["value"],
            )
        service = next(
            (
                item
                for item in claim["services"]
                if item["id"] == actual.get("service_id")
            ),
            {},
        )
        wanted = next(
            item for item in expected["services"] if item["id"] == eob["service_id"]
        )
        for field in ("date", "code", "submitted_pos", "actual_setting"):
            check(
                "service_" + field,
                service.get(field, {}).get("value"),
                wanted[field]["value"],
            )
    check(
        "no_facility_sources",
        bool({"R02", "R03"} & {item["id"] for item in claim["evidence"]}),
        False,
    )
    return checks
