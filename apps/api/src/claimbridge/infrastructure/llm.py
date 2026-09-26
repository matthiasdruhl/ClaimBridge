"""Configured Chat Completions adapter. No keys or response bodies enter logs."""

import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from claimbridge.domain.contracts import ValidationFailure


class ProviderUnavailable(Exception):
    pass


class ProviderFailure(Exception):
    pass


class ModelProvider:
    prompt_version = "claim-extraction-v1"

    def __init__(self, opener=urlopen):
        self.key = os.environ.get("CLAIMBRIDGE_API_KEY", "")
        self.base = os.environ.get("CLAIMBRIDGE_API_BASE_URL", "").rstrip("/")
        self.model = os.environ.get("CLAIMBRIDGE_MODEL", "")
        self.opener = opener
        self.last_metrics = {"http_attempts": 0, "repair_attempts": 0}

    @property
    def ready(self):
        return bool(self.key and self.base and self.model)

    @property
    def configuration(self):
        return {"model": self.model, "base_url": self.base, "prompt_version": self.prompt_version}

    def complete(self, messages, schema):
        if not self.ready:
            raise ProviderUnavailable("PROVIDER_NOT_CONFIGURED")
        parsed = urlparse(self.base)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.query:
            raise ProviderFailure("PROVIDER_URL_INVALID")
        body = json.dumps(
            {
                "model": self.model,
                "messages": messages,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {"name": "claim", "schema": schema},
                },
                "max_tokens": 16000,
            }
        ).encode()
        request = Request(
            self.base + "/chat/completions",
            data=body,
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        for attempt in range(2):
            self.last_metrics["http_attempts"] += 1
            try:
                with self.opener(request, timeout=30) as response:
                    raw = response.read(4 * 1024 * 1024 + 1)
                if len(raw) > 4 * 1024 * 1024:
                    raise ProviderFailure("PROVIDER_RESPONSE_TOO_LARGE")
                envelope = json.loads(raw)
                choice = envelope["choices"][0]
                if choice.get("finish_reason") == "length":
                    raise ValidationFailure("MODEL_OUTPUT_TRUNCATED")
                return json.loads(choice["message"]["content"])
            except HTTPError as error:
                if attempt == 0 and (error.code == 429 or 500 <= error.code <= 599):
                    continue
                raise ProviderFailure(f"PROVIDER_HTTP_{error.code}") from None
            except (URLError, TimeoutError):
                if attempt == 0:
                    continue
                raise ProviderFailure("PROVIDER_TIMEOUT_OR_NETWORK") from None
            except (ValueError, KeyError, IndexError, TypeError):
                raise ValidationFailure("MODEL_JSON_INVALID") from None
        raise ProviderFailure("PROVIDER_FAILED")

    def extract(self, messages, schema, validator):
        self.last_metrics = {"http_attempts": 0, "repair_attempts": 0}
        for attempt in range(2):
            try:
                result = self.complete(messages, schema)
                return validator(result)
            except ValidationFailure as error:
                if attempt:
                    raise
                self.last_metrics["repair_attempts"] += 1
                messages = [
                    *messages,
                    {
                        "role": "user",
                        "content": f"Validation failed ({error}). "
                        "Produce a complete corrected "
                        "object from the original documents. Use only exact source quotations; "
                        "leave unsupported fields unknown. Do not invent missing evidence.",
                    },
                ]
        raise ValidationFailure("MODEL_OUTPUT_INVALID")
