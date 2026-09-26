# Appeals

Action plan, why-this-approach rationale, arguments and draft editor.

Add components, feature hooks, API functions and colocated tests here when implementing this feature. Export its public components/types from `index.ts` once code exists; other features must not import internal files. Do not create empty hooks or barrel exports now.

Cross-feature composition belongs in `app/`. Shared presentational primitives belong in `components/ui/`. Read external data through `lib/api/`; never load expected-case JSON into live analysis. Keep business calculations on the backend.

Optional P1: compose a compact “Why this appeal?” evidence map here using the shared evidence drawer. Reuse validated argument/evidence IDs and the current claim revision; do not infer relationships in the browser. Five or six cards with supports/contradicts/needs-confirmation labels; see claimbridge-prep/product/ui-spec.md.
