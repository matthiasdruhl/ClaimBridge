# Contract ownership

The sole canonical domain contracts currently live in `claimbridge-prep/schemas/*.schema.json`. Keep them there during preparation so existing generators, experiments and documentation remain consistent. This directory is the entry point for API integration documentation; it contains no duplicate schemas.

During the first build step, derive transport types and validation from those schemas. Add `contracts/openapi.yaml` once endpoints are implemented; it must reference canonical domain schemas rather than redefine them. Transport envelopes (jobs/errors/revisions) belong in OpenAPI. Choose a generator then add a reproducibility check to CI.

If schemas later move here, move them once and update all generators, tests and documentation in the same change. Never keep two writable copies. Do not include golden answers in the contract package or browser bundle.


Current implemented transport behavior is documented in the [API contracts](../claimbridge-prep/engineering/api-contracts.md), under the local ingestion and diagnostics sections. The earlier table in that document remains the target claim-workflow design. Diagnostics events are operational metadata, separate from canonical claim/evidence schemas. OpenAPI and generated transport types remain outstanding; do not assume the current runtime enforces every canonical schema automatically.
