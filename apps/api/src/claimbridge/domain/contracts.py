"""Load canonical schemas locally; never read evaluation or golden fixtures."""

import copy
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

SCHEMA_ROOT = Path(__file__).resolve().parents[5] / "claimbridge-prep" / "schemas"
SCHEMAS = {
    name: json.loads((SCHEMA_ROOT / f"{name}.schema.json").read_text())
    for name in ("claim", "evidence", "action-plan")
}
REGISTRY = Registry().with_resources(
    (schema["$id"], Resource.from_contents(schema)) for schema in SCHEMAS.values()
)


class ValidationFailure(Exception):
    """Safe error code without any uploaded content."""


def validate(name, value):
    validator = Draft202012Validator(
        SCHEMAS[name], registry=REGISTRY, format_checker=FormatChecker()
    )
    if next(validator.iter_errors(value), None) is not None:
        raise ValidationFailure("SCHEMA_INVALID")


def unknown(reason="Not established by the supplied records"):
    return dict(value=None, status="unknown", evidence_ids=[], reason=reason, derivation=None)


def fact(value, evidence_ids, status="explicit", reason=None, derivation=None):
    return dict(
        value=value,
        status=status,
        evidence_ids=list(dict.fromkeys(evidence_ids)),
        reason=reason,
        derivation=derivation,
    )


def extraction_schema(source_ids=None):
    schema = copy.deepcopy(SCHEMAS["claim"])
    schema["properties"]["plan"]["properties"]["coverage_active"]["description"] = (
        "Coverage active on the disputed service date under the documented eligibility interval, "
        "not coverage active as of the analysis date."
    )
    schema["properties"]["services"]["items"]["properties"]["facility_id"]["description"] = (
        "Actual documented service facility. Use the encounter's explicit facility identifier "
        "matching a facility provider ID, even if the submitted claim facility field was blank. "
        "Unknown when no source documents establish the actual service facility."
    )
    schema["properties"]["evidence"]["items"] = copy.deepcopy(SCHEMAS["evidence"])
    schema["properties"]["evidence"]["items"].pop("$id", None)
    if source_ids is not None:
        schema["properties"]["evidence"]["items"] = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "id": {"type": "string", "enum": list(source_ids)},
                "domain": {"enum": ["user", "plan"]},
                "kind": {
                    "enum": ["policy", "eob", "denial", "bill", "authorization", "correspondence"]
                },
            },
            "required": ["id", "domain", "kind"],
        }
    return schema


def walk_facts(value, path=""):
    if isinstance(value, dict):
        if {"value", "status", "evidence_ids", "derivation"} <= value.keys():
            yield path, value
        else:
            for key, item in value.items():
                yield from walk_facts(item, f"{path}.{key}".strip("."))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_facts(item, f"{path}.{index}")
