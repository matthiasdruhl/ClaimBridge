"""Provider failure boundaries; never calls a paid API."""

import json
from io import BytesIO
from urllib.error import HTTPError, URLError

import pytest

from claimbridge.domain.contracts import ValidationFailure
from claimbridge.infrastructure.llm import ModelProvider, ProviderFailure


def provider(opener):
    result = ModelProvider(opener)
    result.key, result.base, result.model = (
        "test-secret",
        "https://provider.example/v1",
        "test-model",
    )
    return result


def test_transient_retry_once():
    calls = []

    def opener(request, timeout):
        calls.append(timeout)
        if len(calls) == 1:
            raise HTTPError(request.full_url, 429, "limited", {}, None)
        return BytesIO(json.dumps({"choices": [{"message": {"content": "{}"}}]}).encode())

    assert provider(opener).complete([], {}) == {}
    assert calls == [30, 30]


@pytest.mark.parametrize(
    "failure",
    [
        URLError("secret network detail"),
        TimeoutError(),
        HTTPError("https://provider.example", 503, "secret", {}, None),
    ],
)
def test_failure_is_bounded_and_sanitized(failure):
    calls = []

    def opener(*args, **kwargs):
        calls.append(1)
        raise failure

    with pytest.raises(ProviderFailure) as error:
        provider(opener).complete([], {})
    assert len(calls) == 2
    assert "secret" not in str(error.value)


def test_auth_error_not_retried():
    calls = []

    def opener(*args, **kwargs):
        calls.append(1)
        raise HTTPError("https://provider.example", 401, "secret", {}, None)

    with pytest.raises(ProviderFailure, match="401"):
        provider(opener).complete([], {})
    assert len(calls) == 1


def test_one_repair_for_invalid_json():
    calls = []

    def opener(*args, **kwargs):
        calls.append(1)
        return BytesIO(b"not json")

    with pytest.raises(ValidationFailure, match="MODEL_JSON_INVALID"):
        provider(opener).extract([], {}, lambda value: value)
    assert len(calls) == 2


def test_one_repair_for_invalid_evidence():
    calls = []

    def opener(*args, **kwargs):
        calls.append(1)
        return BytesIO(b'{"choices":[{"message":{"content":"{}"}}]}')

    def reject(value):
        raise ValidationFailure("EVIDENCE_QUOTE_NOT_FOUND")

    with pytest.raises(ValidationFailure):
        provider(opener).extract([], {}, reject)
    assert len(calls) == 2
