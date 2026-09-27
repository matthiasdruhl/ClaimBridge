# Synthetic demo fixture

`synthetic-network-v1.json` contains two retained extraction snapshots from the
final September 26, 2026 live evaluation: `original-1-5` and `original-1-6` in
evaluation `02b1d7a12604432fba879a580395466c`.

Both source runs used Meta `muse-spark-1.3-contributor`, prompt
`claim-extraction-v9`, pipeline `bounded-analysis-v3`, and passed the repository's
schema, source-restoration, semantic, and automatic scenario gates. The source
runtime database remains under ignored `var/evaluations/`; the checked-in fixture
is exported by `scripts/export_demo_fixture.py`. Uploaded document UUIDs are
replaced with their PDF SHA-256 values so the saved evidence can be safely mapped
to a new workspace only after an exact packet match.

Demo Mode revalidates the restored extraction against the newly uploaded PDFs,
then runs the normal deterministic retrieval, reasoning, claim validation,
action-plan, revision, and evidence-persistence path. It never invokes the model
provider. See `docs/live-validation.md` for the recorded run summary and limits.
