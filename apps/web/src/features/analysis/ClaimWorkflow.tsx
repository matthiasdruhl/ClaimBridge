import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api/client';
import {
  isActions,
  isClaimResponse,
  isDraft,
  isJob,
  isProvider,
  isWorkspace,
} from '../../lib/contracts/workflow';
import type {
  Actions,
  ClaimResponse,
  Draft,
  Evidence,
  Fact,
  Job,
  Workspace,
} from '../../lib/contracts/workflow';

const json = (value: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});
const money = (fact: Fact | undefined) =>
  typeof fact?.value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(fact.value / 100)
    : 'Unknown';
const display = (fact: Fact | undefined) =>
  fact?.value == null ? 'Unknown' : String(fact.value);
export function ClaimWorkflow({
  workspace,
  onWorkspace,
}: {
  workspace: Workspace;
  onWorkspace: (value: Workspace) => void;
}) {
  const [result, setResult] = useState<ClaimResponse | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<boolean | null>(null);
  const [actions, setActions] = useState<Actions | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const prefix = `/workspaces/${workspace.id}`;
  const claim = result?.claim;
  const stale =
    !!claim &&
    (claim.revision !== workspace.revision ||
      result?.analysis_status === 'stale');
  const running = job?.status === 'queued' || job?.status === 'running';
  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest(`${prefix}/claim`, {}, isClaimResponse),
      apiRequest('/provider-status', {}, isProvider),
    ])
      .then(([response, status]) => {
        if (!active) return;
        setResult(response);
        setJob(response.job);
        setProvider(status.configured);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [prefix, workspace.revision]);
  useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return;
    let active = true;
    let polling = false;
    const interval = setInterval(() => {
      if (document.hidden || polling) return;
      polling = true;
      void apiRequest(`/jobs/${job.job_id}`, {}, isJob)
        .then(async (next) => {
          if (!active) return;
          if (next.status === 'succeeded') {
            const response = await apiRequest(
              `${prefix}/claim`,
              {},
              isClaimResponse,
            );
            if (active) {
              setResult(response);
              setActions(null);
              setDraft(null);
              setSaved('');
            }
          }
          if (active) setJob(next);
        })
        .catch((reason: Error) => {
          if (active) setError(reason.message);
        })
        .finally(() => {
          polling = false;
        });
    }, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [job, prefix]);
  async function perform(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  }
  const citations = (ids: string[]) => (
    <span className="citations">
      {ids.map((id) => (
        <button
          key={id}
          onClick={() =>
            setEvidence(claim?.evidence.find((item) => item.id === id) ?? null)
          }
        >
          {id}
        </button>
      ))}
    </span>
  );
  return (
    <section id="claim-analysis" className="panel claim-workflow">
      <div className="viewer-heading">
        <div>
          <p className="eyebrow">CLAIM ANALYSIS</p>
          <h2>From documents to next steps</h2>
        </div>
        <button
          disabled={
            busy || running || !workspace.documents.length || provider === false
          }
          onClick={() =>
            void perform(async () => {
              setJob(
                await apiRequest(
                  `${prefix}/process`,
                  json({
                    expected_revision: workspace.revision,
                    document_ids: workspace.documents.map(
                      (item) => item.document.id,
                    ),
                  }),
                  isJob,
                ),
              );
            })
          }
        >
          {running
            ? 'Processing…'
            : stale
              ? 'Analyze new revision'
              : 'Analyze documents'}
        </button>
      </div>
      {provider === false && (
        <p className="notice">
          Live analysis is unavailable until the backend API key, base URL, and
          model are configured. Your documents are saved. No simulated
          conclusions are shown.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {job && (
        <p role="status">
          Processing: <strong>{job.status}</strong> · {job.stage}
          {job.error && ` · ${job.error}`}
          {job.retryable && ' · Retry analysis after resolving the issue.'}
        </p>
      )}
      {stale && (
        <p className="error">
          This is an earlier analysis. New evidence or answers require
          regeneration; actions and drafts are unavailable until then.
        </p>
      )}
      {claim && (
        <>
          <p className="muted">
            Analysis revision {claim.revision} ·{' '}
            {result?.analysis_status.replaceAll('_', ' ')} ·{' '}
            {result?.metadata.elapsed_ms == null
              ? ''
              : `${(result.metadata.elapsed_ms / 1000).toFixed(1)} seconds`}{' '}
            ·{' '}
            {result?.metadata.mode === 'test_double'
              ? 'TEST DATA — not live model performance. '
              : ''}
            Results require source review.
          </p>
          {!!result?.revisions.length && (
            <label>
              Review saved revision{' '}
              <select
                value={claim.revision}
                onChange={(event) =>
                  void perform(async () => {
                    setResult(
                      await apiRequest(
                        `${prefix}/claim?revision=${event.target.value}`,
                        {},
                        isClaimResponse,
                      ),
                    );
                    setActions(null);
                    setDraft(null);
                    setEvidence(null);
                  })
                }
              >
                {result.revisions.map((revision) => (
                  <option key={revision} value={revision}>
                    {revision}
                  </option>
                ))}
              </select>
            </label>
          )}
          <h3>Claim amounts — separate records, not combined debts</h3>
          <div className="claim-money">
            {claim.eobs.map((eob) => (
              <article className="page" key={eob.id}>
                <h3>Claim {display(eob.claim_id)}</h3>
                {[
                  'billed_cents',
                  'allowed_cents',
                  'paid_cents',
                  'member_cents',
                ].map((field) => (
                  <p key={field}>
                    {field
                      .replace('_cents', '')
                      .replace('member', 'EOB member responsibility')}
                    : <strong>{money(eob.financial[field])}</strong>
                    {citations(eob.financial[field]?.evidence_ids ?? [])}
                  </p>
                ))}
              </article>
            ))}
          </div>
          {claim.bills.map((bill) => (
            <p key={bill.id}>
              Bill snapshot for {display(bill.claim_id)}:{' '}
              {money(bill.balance_cents)} as of {display(bill.statement_date)}.
              Not added to the EOB amount.{' '}
              {citations(bill.balance_cents.evidence_ids)}
            </p>
          ))}
          <p>
            <strong>
              Corrected liability: {money(claim.corrected_liability_cents)}
            </strong>{' '}
            — {claim.corrected_liability_cents.reason}
          </p>
          <h3>What the evidence supports</h3>
          {claim.conclusions.map((conclusion) => (
            <article className="page" key={conclusion.id}>
              <span className="eyebrow">
                {conclusion.classification} ·{' '}
                {conclusion.outcome.replaceAll('_', ' ')}
              </span>
              <p>{conclusion.text}</p>
              {citations(conclusion.evidence_ids)}
              {!!conclusion.unresolved.length && (
                <p className="muted">
                  Still unresolved: {conclusion.unresolved.join('; ')}
                </p>
              )}
            </article>
          ))}
          <h3>Clarify the missing information</h3>
          {claim.questions.map((question) => (
            <form
              className="page"
              key={question.id}
              onSubmit={(event) => {
                event.preventDefault();
                const formAnswer = new FormData(event.currentTarget).get(
                  'answer',
                );
                void perform(async () => {
                  const state = await apiRequest(
                    `${prefix}/questions/${question.id}/answer`,
                    json({
                      expected_revision: workspace.revision,
                      answer: String(formAnswer ?? ''),
                      supporting_document_ids: [],
                    }),
                    isWorkspace,
                  );
                  onWorkspace(state);
                  setActions(null);
                  setDraft(null);
                });
              }}
            >
              <label>
                {question.prompt}
                {question.id === 'Q-location' ? (
                  <select
                    name="answer"
                    aria-label={question.prompt}
                    value={answers[question.id] ?? question.answer ?? ''}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [question.id]: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Choose reported setting</option>
                    <option value="asc">Ambulatory surgical center</option>
                    <option value="hospital">Hospital</option>
                    <option value="office">Ordinary office</option>
                    <option value="unknown">Not sure</option>
                  </select>
                ) : (
                  <input
                    name="answer"
                    aria-label={question.prompt}
                    type={question.id === 'Q-receipt' ? 'date' : 'text'}
                    value={answers[question.id] ?? question.answer ?? ''}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [question.id]: event.target.value,
                      })
                    }
                    required
                    maxLength={2000}
                  />
                )}
              </label>
              <p className="muted">
                {question.why} · {question.status.replaceAll('_', ' ')}
              </p>
              <button disabled={busy || running}>Save answer</button>
            </form>
          ))}
          <p>
            Appeal date: <strong>{display(claim.denial.deadline)}</strong>{' '}
            {citations(claim.denial.deadline?.evidence_ids ?? [])}
          </p>
          <p className="muted">
            {claim.denial.deadline?.reason} Receipt source:{' '}
            {claim.denial.received_date?.status}. No weekend extension is
            assumed.
          </p>
          <div className="workflow-buttons">
            <button
              disabled={busy || stale || running}
              onClick={() =>
                void perform(async () => {
                  setActions(
                    await apiRequest(
                      `${prefix}/action-plan`,
                      json({ expected_revision: workspace.revision }),
                      isActions,
                    ),
                  );
                })
              }
            >
              Show action plan
            </button>
            <button
              disabled={busy || stale || running}
              onClick={() =>
                void perform(async () => {
                  const next = await apiRequest(
                    `${prefix}/appeal-draft`,
                    json({ expected_revision: workspace.revision }),
                    isDraft,
                  );
                  setDraft(next);
                  setText(next.text);
                  setSaved('Draft generated. Review before use.');
                })
              }
            >
              Prepare appeal draft
            </button>
          </div>
          {actions && !stale && (
            <section>
              <h3>Action plan — not submitted</h3>
              {actions.actions.map((action) => (
                <article className="page" key={action.id}>
                  <h3>{action.title}</h3>
                  <p>{action.instructions}</p>
                  <p>Due: {display(action.due)}</p>
                  {citations(action.evidence_ids)}
                </article>
              ))}
              <h3>Why this approach?</h3>
              {actions.arguments.map((argument) => (
                <article key={argument.id}>
                  <p>{argument.statement}</p>
                  {citations(argument.evidence_ids)}
                  <p>{argument.requested_remedy}</p>
                </article>
              ))}
            </section>
          )}
          {!!result?.draft_ids.length && (
            <label>
              Saved drafts{' '}
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value)
                    void perform(async () => {
                      const loaded = await apiRequest(
                        `${prefix}/appeal-drafts/${event.target.value}`,
                        {},
                        isDraft,
                      );
                      setDraft(loaded);
                      setText(loaded.text);
                      setSaved('Saved draft loaded.');
                    });
                }}
              >
                <option value="">Choose a saved draft</option>
                {result.draft_ids.map((id) => (
                  <option key={id} value={id}>
                    {id.slice(0, 12)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft && (
            <section className="draft">
              <h3>Appeal draft · NOT SUBMITTED</h3>
              <p>
                Revision {draft.revision} ·{' '}
                {draft.user_edited
                  ? 'User edited; edits are not automatically validated'
                  : 'Generated from supported arguments'}
              </p>
              {(stale || draft.revision !== workspace.revision) && (
                <p className="error">
                  Historical draft: regenerate against the current analysis
                  before use.
                </p>
              )}
              <textarea
                aria-label="Appeal draft"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setSaved('Unsaved edits');
                }}
                rows={20}
              />
              <p>Unresolved: {draft.unresolved_fields.join(', ')}</p>
              <p>
                {draft.attachments.length} source documents referenced; export
                contains text only.
              </p>
              <div className="workflow-buttons">
                <button
                  disabled={
                    busy || stale || draft.revision !== workspace.revision
                  }
                  onClick={() =>
                    void perform(async () => {
                      setDraft(
                        await apiRequest(
                          `${prefix}/appeal-drafts/${draft.draft_id}`,
                          {
                            ...json({
                              expected_revision: workspace.revision,
                              expected_version: draft.version,
                              text,
                            }),
                            method: 'PUT',
                          },
                          isDraft,
                        ),
                      );
                      setSaved('Saved');
                    })
                  }
                >
                  Save edits
                </button>
                <button
                  disabled={stale || draft.revision !== workspace.revision}
                  onClick={() =>
                    void perform(async () => {
                      await navigator.clipboard.writeText(text);
                      setSaved('Copied');
                    })
                  }
                >
                  Copy draft
                </button>
                <button
                  disabled={stale || draft.revision !== workspace.revision}
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([text], { type: 'text/plain' }),
                    );
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'claimbridge-appeal-draft.txt';
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download text
                </button>
              </div>
              <p role="status">{saved}</p>
            </section>
          )}
        </>
      )}
      {evidence && (
        <section
          className="evidence-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Source evidence"
        >
          <button onClick={() => setEvidence(null)}>Close evidence</button>
          <h2>
            {evidence.kind} · {evidence.location.section}
          </h2>
          <p>
            {evidence.domain} · {evidence.text_kind.replaceAll('_', ' ')}
          </p>
          {evidence.text_kind === 'verbatim' ? (
            <blockquote>{evidence.text}</blockquote>
          ) : (
            <p>{evidence.text}</p>
          )}
          {evidence.document_id && (
            <a
              href={`/api/v1${prefix}/documents/${evidence.document_id}/content#page=${evidence.location.page ?? 1}`}
              target="_blank"
              rel="noreferrer"
            >
              Open original · page {evidence.location.page}
            </a>
          )}
          {evidence.source_url && (
            <a href={evidence.source_url} target="_blank" rel="noreferrer">
              External source · accessed {evidence.accessed_at}
            </a>
          )}
          <p className="muted">
            Exact source matching verifies the quotation, not that every
            interpretation is correct.
          </p>
        </section>
      )}
    </section>
  );
}
