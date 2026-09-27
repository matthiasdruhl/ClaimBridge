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
import {
  evidenceLabel,
  outcomePresentation,
  selectDisputedRecord,
  selectPrimaryConclusion,
  settingLabel,
} from './presentation';

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
const readableDraft = (value: string) =>
  value.replace(/^Supporting references:.*(?:\r?\n)?/gim, '');
export function ClaimWorkflow({
  workspace,
  onWorkspace,
  stage,
  onStage,
}: {
  workspace: Workspace;
  onWorkspace: (value: Workspace) => void;
  stage: 'documents' | 'analysis' | 'appeal';
  onStage: (value: 'documents' | 'analysis' | 'appeal') => void;
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
  const disputed = claim ? selectDisputedRecord(claim) : null;
  const primaryConclusion = claim ? selectPrimaryConclusion(claim) : undefined;
  const presentation = outcomePresentation(primaryConclusion?.outcome);
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
        if (response.claim) onStage('analysis');
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [onStage, prefix, workspace.revision]);
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
              onStage('analysis');
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
  }, [job, onStage, prefix]);
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
  async function startAnalysis() {
    setJob(
      await apiRequest(
        `${prefix}/process`,
        json({
          expected_revision: workspace.revision,
          document_ids: workspace.documents.map((item) => item.document.id),
        }),
        isJob,
      ),
    );
  }
  async function prepareDraft() {
    const next = await apiRequest(
      `${prefix}/appeal-draft`,
      json({ expected_revision: workspace.revision }),
      isDraft,
    );
    setDraft(next);
    setText(readableDraft(next.text));
    setSaved('Draft generated. Review before use.');
    onStage('appeal');
  }
  const citations = (ids: string[]) => {
    const items = ids.map((id) => ({
      id,
      evidence: claim?.evidence.find((item) => item.id === id),
    }));
    const baseLabels = items.map((item) =>
      item.evidence
        ? evidenceLabel(item.evidence, workspace)
        : 'Source unavailable',
    );
    return (
      <span className="citations" aria-label="Supporting sources">
        {items.map((item, index) => {
          const baseLabel = baseLabels[index] ?? 'Source unavailable';
          const label = baseLabel;
          return (
            <button
              key={item.id}
              aria-label={`Open source: ${label}`}
              onClick={() => setEvidence(item.evidence ?? null)}
            >
              {label}
            </button>
          );
        })}
      </span>
    );
  };
  if (!claim || stage === 'documents') {
    return (
      <section id="claim-analysis" className="analysis-launch">
        <div>
          <strong>Ready to review the claim?</strong>
          <p>
            ClaimBridge will compare the documents and show where the records
            agree, conflict, or need more information.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={
            busy || running || !workspace.documents.length || provider === false
          }
          onClick={() => void perform(startAnalysis)}
        >
          {running ? 'Reviewing documents…' : 'Analyze documents'}
        </button>
        {provider === false && (
          <p className="notice" role="status">
            Analysis is unavailable until the model provider is configured. Your
            documents are saved.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {job && (
          <p className="muted" role="status">
            {job.status === 'failed'
              ? job.error
              : `Review status: ${job.stage.replaceAll('_', ' ')}`}
          </p>
        )}
      </section>
    );
  }
  if (draft && stage === 'appeal') {
    const historical = stale || draft.revision !== workspace.revision;
    return (
      <section id="claim-analysis" className="appeal-screen">
        <div className="screen-title-row">
          <div>
            <p className="kicker">Appeal preparation</p>
            <h1>Prepare your appeal</h1>
            <p className="screen-status">
              {saved || 'Draft saved'} · Not submitted
            </p>
          </div>
          <button
            className="primary-button"
            disabled={historical}
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
            Download draft
          </button>
        </div>
        <button className="back-link" onClick={() => onStage('analysis')}>
          Back to claim review
        </button>
        {historical && (
          <p className="error">
            This draft uses an earlier case revision. Return to the claim review
            and prepare a new draft before use.
          </p>
        )}
        {!!draft.unresolved_fields.length && (
          <section className="review-alert" aria-labelledby="review-items">
            <h2 id="review-items">Review before sending</h2>
            <p>
              Confirm these details in the letter:{' '}
              {draft.unresolved_fields.join(', ')}.
            </p>
          </section>
        )}
        <div className="appeal-layout">
          <section className="draft-editor">
            <div className="section-header">
              <div>
                <h2>Appeal letter</h2>
                <p>Edit the draft so it accurately reflects your situation.</p>
              </div>
              <span>{text.length.toLocaleString()} characters</span>
            </div>
            <textarea
              aria-label="Appeal draft"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setSaved('Unsaved edits');
              }}
              rows={25}
            />
            <div className="draft-actions">
              <button
                className="secondary-button"
                disabled={busy || historical}
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
                className="text-button"
                disabled={historical}
                onClick={() =>
                  void perform(async () => {
                    await navigator.clipboard.writeText(text);
                    setSaved('Copied');
                  })
                }
              >
                Copy text
              </button>
            </div>
          </section>
          <aside className="appeal-checklist">
            <section>
              <h2>Before you send it</h2>
              <ul className="check-list">
                <li>Check the member and claim details.</li>
                <li>Confirm the appeal address and deadline.</li>
                <li>Attach the documents listed below.</li>
                <li>Keep a copy and delivery confirmation.</li>
              </ul>
            </section>
            <section>
              <h2>Appeal deadline</h2>
              <strong className="deadline">
                {display(claim.denial.deadline)}
              </strong>
              <p className="muted">
                Verify the date in your denial letter. No weekend extension is
                assumed.
              </p>
            </section>
            <section>
              <h2>Attachments</h2>
              <p>{draft.attachments.length} source documents referenced.</p>
              <p className="muted">
                The download contains the letter text only.
              </p>
            </section>
            {!!result?.draft_ids.length && (
              <label>
                Open a saved draft
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
                        setText(readableDraft(loaded.text));
                        setSaved('Saved draft loaded');
                      });
                  }}
                >
                  <option value="">Choose saved draft</option>
                  {result.draft_ids.map((id, index) => (
                    <option key={id} value={id}>
                      Draft {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </aside>
        </div>
        <p className="submission-note">
          ClaimBridge does not submit appeals. You decide whether and how to
          send this draft.
        </p>
      </section>
    );
  }
  return (
    <section id="claim-analysis" className="panel claim-workflow">
      <div className="viewer-heading">
        <div>
          <p className="kicker">Completed claim analysis</p>
          <h1>Your claim review is ready</h1>
          <p>
            Review the finding and its supporting evidence before preparing an
            appeal.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={busy || stale || running}
          onClick={() => void perform(prepareDraft)}
        >
          Prepare appeal
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
      {job && job.status !== 'succeeded' && (
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
            Review completed for case revision {claim.revision}. Confirm
            important details against the original documents.
          </p>
          {!!result?.revisions.length && (
            <label className="revision-picker">
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
          <section className={`case-brief ${presentation.tone}`}>
            <div className="case-brief-heading">
              <div>
                <p className="kicker">Main finding</p>
                <h3>{presentation.headline}</h3>
              </div>
              <span className="case-status">{presentation.label}</span>
            </div>
            {primaryConclusion && (
              <p className="case-summary">{primaryConclusion.text}</p>
            )}
            <dl className="case-facts">
              <div>
                <dt>Amount in dispute</dt>
                <dd>
                  <strong>
                    {money(
                      disputed?.eob?.financial.member_cents ??
                        disputed?.eob?.financial.billed_cents,
                    )}
                  </strong>
                  {citations(
                    disputed?.eob?.financial.member_cents?.evidence_ids ??
                      disputed?.eob?.financial.billed_cents?.evidence_ids ??
                      [],
                  )}
                </dd>
              </div>
              <div>
                <dt>Denial states</dt>
                <dd>
                  {display(claim.denial.reason)}
                  {citations(claim.denial.reason?.evidence_ids ?? [])}
                </dd>
              </div>
              <div>
                <dt>Submitted setting</dt>
                <dd>
                  {settingLabel(disputed?.service?.submitted_pos.value, true)}
                  {citations(
                    disputed?.service?.submitted_pos.evidence_ids ?? [],
                  )}
                </dd>
              </div>
              <div>
                <dt>Documented setting</dt>
                <dd>
                  {settingLabel(disputed?.service?.actual_setting.value)}
                  {citations(
                    disputed?.service?.actual_setting.evidence_ids ?? [],
                  )}
                </dd>
              </div>
              <div className="case-fact-wide">
                <dt>Corrected amount owed</dt>
                <dd>
                  <strong>{money(claim.corrected_liability_cents)}</strong>
                  <span>{claim.corrected_liability_cents.reason}</span>
                </dd>
              </div>
            </dl>
            <div className="case-brief-footer">
              <div>
                <span>Supporting sources</span>
                {citations(primaryConclusion?.evidence_ids ?? [])}
              </div>
              <nav aria-label="Case analysis shortcuts">
                <a href="#evidence-findings">Review evidence ↓</a>
                <a href="#claim-next-steps">Continue to next steps ↓</a>
              </nav>
            </div>
          </section>
          <h3 className="section-heading">
            Claim amounts{' '}
            <span>kept separate, never combined into one debt</span>
          </h3>
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
          <h3 className="section-heading" id="evidence-findings">
            What the evidence supports
          </h3>
          {claim.conclusions.map((conclusion) => (
            <article className="page" key={conclusion.id}>
              <span className="finding-type">
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
          <h3 className="section-heading" id="claim-next-steps">
            Clarify the missing information
          </h3>
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
              className="secondary-button"
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
          </div>
          {actions && !stale && (
            <section>
              <h3>Action plan — not submitted</h3>
              {actions.actions.map((action) => (
                <article className="page" key={action.id}>
                  <h3>{action.title}</h3>
                  <p>{action.instructions}</p>
                  <p>
                    Due: {display(action.due)}{' '}
                    {citations(action.due.evidence_ids)}
                  </p>
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
        </>
      )}
      {evidence && (
        <section
          className="evidence-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Source evidence"
        >
          <div className="evidence-drawer-heading">
            <div>
              <p className="kicker">Source evidence</p>
              <h2>{evidenceLabel(evidence, workspace)}</h2>
            </div>
            <button onClick={() => setEvidence(null)}>Close</button>
          </div>
          <p className="evidence-meta">
            {evidence.kind.replaceAll('_', ' ')} ·{' '}
            {evidence.domain.replaceAll('_', ' ')} ·{' '}
            {evidence.text_kind.replaceAll('_', ' ')}
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
            This excerpt supports the finding, but it does not decide the claim
            on its own.
          </p>
        </section>
      )}
    </section>
  );
}
