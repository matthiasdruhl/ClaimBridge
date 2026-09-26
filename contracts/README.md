# Contract ownership

The sole canonical domain contracts currently live in `claimbridge-prep/schemas/*.schema.json`. Keep them there during preparation so existing generators, experiments and documentation remain consistent. This directory is the entry point for API integration documentation; it contains no duplicate schemas.

During the first build step, derive transport types and validation from those schemas. Add `contracts/openapi.yaml` once endpoints are implemented; it must reference canonical domain schemas rather than redefine them. Transport envelopes (jobs/errors/revisions) belong in OpenAPI. Choose a generator then add a reproducibility check to CI.

If schemas later move here, move them once and update all generators, tests and documentation in the same change. Never keep two writable copies. Do not include golden answers in the contract package or browser bundle.
