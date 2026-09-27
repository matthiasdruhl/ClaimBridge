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
  Claim,
  ClaimResponse,
  Draft,
  Evidence,
  Fact,
  Job,
  Workspace,
} from '../../lib/contracts/workflow';
import {
  analysisProgress,
  documentTypeLabel,
  evidenceLabel,
  evidenceStatusMarker,
  evidenceStory,
  orderClarifications,
  outcomePresentation,
  prioritizedUnresolvedItems,
  selectDisputedRecord,
  selectPrimaryConclusion,
  trustSummary,
  technicalTrace,
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
  demoMode,
  onUpload,
}: {
  workspace: Workspace;
  onWorkspace: (value: Workspace) => void;
  stage: 'documents' | 'analysis' | 'appeal';
  onStage: (value: 'documents' | 'analysis' | 'appeal') => void;
  demoMode: boolean;
  onUpload: (files: FileList | File[] | null) => Promise<Workspace | null>;
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
  const [evidenceAdded, setEvidenceAdded] = useState(false);
  const prefix = `/workspaces/${workspace.id}`;
  const claim = result?.claim;
  const stale =
    !!claim &&
    (claim.revision !== workspace.revision ||
      result?.analysis_status === 'stale');
  const currentRevisionAnalyzed =
    result?.revisions.includes(workspace.revision) ?? false;
  const updateNeeded = stale && !currentRevisionAnalyzed;
  const running = job?.status === 'queued' || job?.status === 'running';
  const disputed = claim ? selectDisputedRecord(claim) : null;
  const primaryConclusion = claim ? selectPrimaryConclusion(claim) : undefined;
  const presentation = outcomePresentation(primaryConclusion?.outcome);
  const story = claim ? evidenceStory(claim) : [];
  const unknowns = claim
    ? prioritizedUnresolvedItems(claim)
    : { highImpact: [], secondary: [] };
  const trust = claim ? trustSummary(claim) : null;
  const trace = claim ? technicalTrace(claim) : null;
  const savedDemoResult = result?.metadata.mode === 'retained_validated_demo';
  const questions = claim
    ? orderClarifications(
        claim.questions.filter(
          (question) => question.status !== 'resolved_by_document',
        ),
      )
    : [];
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
  useEffect(() => {
    if (!claim || stale || actions) return;
    let active = true;
    void apiRequest(
      `${prefix}/action-plan`,
      json({ expected_revision: workspace.revision }),
      isActions,
    )
      .then((value) => {
        if (active) setActions(value);
      })
      .catch(() => {
        /* The main finding remains usable if next-step loading fails. */
      });
    return () => {
      active = false;
    };
  }, [actions, claim, prefix, stale, workspace.revision]);
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
          demo_mode: demoMode,
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
  const clarificationForm = (
    question: Claim['questions'][number],
    critical = false,
  ) => (
    <form
      className={`clarification-card ${critical ? 'critical' : 'secondary'}`}
      key={question.id}
      onSubmit={(event) => {
        event.preventDefault();
        const formAnswer = new FormData(event.currentTarget).get('answer');
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
      <div>
        {critical && (
          <span className="clarification-priority">Most important</span>
        )}
        <h3>{question.prompt}</h3>
        <p>{question.why}</p>
      </div>
      {question.id === 'Q-location' ? (
        <>
          <strong className="choice-heading">Tell us what you know</strong>
          <input
            name="answer"
            type="hidden"
            value={answers[question.id] ?? question.answer ?? ''}
          />
          <div
            className="choice-group"
            role="group"
            aria-label={question.prompt}
          >
            {[
              { value: 'asc', label: 'Ambulatory surgical center' },
              { value: 'hospital', label: 'Hospital' },
              { value: 'office', label: 'Office' },
              { value: 'unknown', label: 'I’m not sure' },
            ].map(({ value, label }) => (
              <button
                type="button"
                aria-pressed={
                  (answers[question.id] ?? question.answer) === value
                }
                key={value}
                onClick={() => setAnswers({ ...answers, [question.id]: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <input
          name="answer"
          aria-label={question.prompt}
          type={question.id === 'Q-receipt' ? 'date' : 'text'}
          value={answers[question.id] ?? question.answer ?? ''}
          onChange={(event) =>
            setAnswers({ ...answers, [question.id]: event.target.value })
          }
          required
          maxLength={2000}
        />
      )}
      <div className="clarification-actions">
        <span>User-reported until documented</span>
        <button
          className="secondary-button"
          disabled={
            busy || running || !(answers[question.id] ?? question.answer)
          }
        >
          Add this information
        </button>
      </div>
      {critical && (
        <section className="supporting-document-prompt">
          <div>
            <strong>Have a document that confirms this?</strong>
            <p>
              Upload an encounter record, facility record, network record, or
              other supporting document.
            </p>
          </div>
          <label className={`secondary-button ${busy ? 'disabled' : ''}`}>
            Upload supporting document
            <input
              aria-label="Upload a supporting document to this case"
              type="file"
              accept="application/pdf"
              disabled={busy}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                void perform(async () => {
                  const state = await onUpload(files);
                  if (!state) return;
                  onWorkspace(state);
                  setEvidenceAdded(true);
                  setActions(null);
                  setDraft(null);
                });
              }}
            />
          </label>
        </section>
      )}
    </form>
  );
  if (!claim || stage === 'documents') {
    if (running) {
      const progress = analysisProgress(job?.stage);
      return (
        <section
          id="claim-analysis"
          className="analysis-progress"
          aria-live="polite"
        >
          <div className="progress-intro">
            <p className="kicker">Evidence-backed review</p>
            <h2>Reviewing your claim</h2>
            <p>
              {demoMode
                ? 'ClaimBridge is loading and revalidating the retained result for this exact synthetic document packet.'
                : 'ClaimBridge checks conclusions against the documents before showing them. This usually takes 30–60 seconds.'}
            </p>
          </div>
          <ol className="progress-stages">
            {progress.map((item) => (
              <li className={item.state} key={item.id}>
                <span aria-hidden="true">
                  {item.state === 'complete'
                    ? '✓'
                    : item.state === 'active'
                      ? '●'
                      : '○'}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  {item.state === 'active' && <p>{item.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    }
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
            busy ||
            running ||
            !workspace.documents.length ||
            (!demoMode && provider === false)
          }
          onClick={() => void perform(startAnalysis)}
        >
          {demoMode ? 'Open saved analysis' : 'Analyze claim'}
        </button>
        {provider === false && !demoMode && (
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
        {job?.status === 'failed' && (
          <p className="muted" role="status">
            Analysis could not be completed. {job.error}
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
            <h1>Your appeal package is ready to review</h1>
            <p className="screen-status">
              {saved || 'Draft saved'} · Not submitted
            </p>
          </div>
          <div className="appeal-primary-actions">
            <button
              className="secondary-button"
              disabled={historical}
              onClick={() =>
                void perform(async () => {
                  await navigator.clipboard.writeText(text);
                  setSaved('Copied');
                })
              }
            >
              Copy appeal
            </button>
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
              <ul className="attachment-list">
                {draft.attachments.map((id) => {
                  const document = workspace.documents.find(
                    (item) => item.document.id === id,
                  );
                  return (
                    <li key={id}>
                      {document
                        ? documentTypeLabel(document.document.filename)
                        : 'Source document'}
                    </li>
                  );
                })}
              </ul>
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
          <h1>Here’s what happened with this claim</h1>
          <p>
            Review the finding and its supporting evidence before preparing an
            appeal.
          </p>
        </div>
        <a className="primary-button" href="#evidence-story">
          Review evidence
        </a>
      </div>
      {savedDemoResult && (
        <p className="demo-analysis-note" role="status">
          Demo mode — this result comes from a retained validated run for the
          exact synthetic document packet, not a live provider request.
        </p>
      )}
      {provider === false && !demoMode && (
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
      {updateNeeded && (
        <section className="update-analysis" role="status">
          <div>
            <strong>
              {evidenceAdded ? 'New evidence added' : 'New information added'}
            </strong>
            <p>
              Update the claim review to incorporate this{' '}
              {evidenceAdded ? 'document' : 'information'}. Your previous
              finding and analysis history are preserved.
            </p>
          </div>
          <button
            className="primary-button"
            disabled={busy || running || (!demoMode && provider === false)}
            onClick={() => void perform(startAnalysis)}
          >
            Update claim review
          </button>
        </section>
      )}
      {claim && (
        <>
          <section className={`finding-hero ${presentation.tone}`}>
            <div className="finding-amount">
              <span>Amount in dispute</span>
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
            </div>
            <div className="finding-copy">
              <span className="case-status">{presentation.label}</span>
              <h2>{presentation.headline}</h2>
              <p>
                {primaryConclusion?.text ??
                  'The available records need further review.'}
              </p>
              <div className="finding-proof">
                <strong>
                  {new Set(primaryConclusion?.evidence_ids ?? []).size} pieces
                  of supporting evidence
                </strong>
                <a href="#evidence-story">Review the evidence</a>
              </div>
            </div>
          </section>

          {trust && (
            <section className="trust-summary" aria-label="Evidence check">
              <strong>Evidence check</strong>
              <span>✓ {trust.supportedFacts} document-supported facts</span>
              <span>? {trust.unresolvedItems} items still unresolved</span>
              <span>
                ✓ {trust.primarySourceCount} sources for the main finding
              </span>
            </section>
          )}

          <section className="evidence-story" id="evidence-story">
            <div className="section-intro">
              <p className="kicker">Trace the finding</p>
              <h2>Why ClaimBridge flagged this</h2>
              <p>
                Each step comes from the claim record or a bounded conclusion.
                Open any source to inspect the exact supporting text.
              </p>
            </div>
            <ol>
              {story.map((step, index) => (
                <li className={step.kind} key={`${step.title}-${index}`}>
                  <span className="story-number">{index + 1}</span>
                  <div>
                    <span
                      className={`evidence-classification status-${step.status}`}
                    >
                      <span
                        className="evidence-status-marker"
                        aria-hidden="true"
                      >
                        {evidenceStatusMarker(step.status)}
                      </span>
                      {step.statusLabel}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.detail}</p>
                    {citations(step.evidenceIds)}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="unknowns-section">
            <div className="section-intro">
              <p className="kicker">Honest uncertainty</p>
              <h2>What we still don’t know</h2>
              <p>
                These details are most likely to change or narrow the finding.
              </p>
            </div>
            <div className="unknown-list high-impact-unknowns">
              {unknowns.highImpact.map((item) => (
                <article key={item.title}>
                  <span aria-hidden="true">?</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.why}</p>
                  </div>
                </article>
              ))}
            </div>
            {!!unknowns.secondary.length && (
              <details className="secondary-unresolved">
                <summary>
                  Other unresolved details ({unknowns.secondary.length})
                </summary>
                <div className="unknown-list">
                  {unknowns.secondary.map((item) => (
                    <article key={item.title}>
                      <span aria-hidden="true">?</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.why}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            )}
          </section>

          {!!questions.length && (
            <section className="clarification-section" id="claim-next-steps">
              <div className="section-intro">
                <p className="kicker">Strengthen the case</p>
                <h2>A few details could clarify the review</h2>
                <p>
                  Your answer is treated as user-reported until supported by a
                  document.
                </p>
              </div>
              {questions.find((question) => question.id === 'Q-location') &&
                clarificationForm(
                  questions.find((question) => question.id === 'Q-location')!,
                  true,
                )}
              {questions.some((question) => question.id !== 'Q-location') && (
                <details className="secondary-clarifications">
                  <summary>
                    Other details that may help (
                    {
                      questions.filter(
                        (question) => question.id !== 'Q-location',
                      ).length
                    }
                    )
                  </summary>
                  {questions
                    .filter((question) => question.id !== 'Q-location')
                    .map((question) => clarificationForm(question))}
                </details>
              )}
            </section>
          )}

          {actions && !stale && (
            <section className="action-plan">
              <div className="section-intro">
                <p className="kicker">Suggested, not completed</p>
                <h2>Recommended next steps</h2>
              </div>
              <ol>
                {actions.actions.map((action) => (
                  <li key={action.id}>
                    <div>
                      <span className="action-state">Suggested</span>
                      <h3>{action.title}</h3>
                      <p>{action.instructions}</p>
                      {action.due.value != null && (
                        <p className="action-deadline">
                          Complete by <strong>{display(action.due)}</strong>{' '}
                          {citations(action.due.evidence_ids)}
                        </p>
                      )}
                      {citations(action.evidence_ids)}
                    </div>
                  </li>
                ))}
              </ol>
              <button
                className="primary-button"
                disabled={busy || stale || running}
                onClick={() => void perform(prepareDraft)}
              >
                Create appeal draft
              </button>
            </section>
          )}

          {trace && (
            <details className="technical-trace">
              <summary>View technical trace</summary>
              <div className="technical-trace-intro">
                <div>
                  <p className="kicker">Technical transparency</p>
                  <h2>How this result was assembled</h2>
                </div>
                <a href="/evaluation">How ClaimBridge works</a>
              </div>
              <dl>
                <div>
                  <dt>{workspace.documents.length}</dt>
                  <dd>Documents considered</dd>
                </div>
                <div>
                  <dt>{trace.selectedEvidence}</dt>
                  <dd>Evidence items retained</dd>
                </div>
                <div>
                  <dt>
                    {trace.exactRestorations} / {trace.documentEvidence}
                  </dt>
                  <dd>Document passages restored as exact matches</dd>
                </div>
                <div>
                  <dt>{trace.userReported}</dt>
                  <dd>User-reported evidence items</dd>
                </div>
                <div>
                  <dt>{trace.conflicts}</dt>
                  <dd>Conflicted facts preserved</dd>
                </div>
                <div>
                  <dt>{trace.unresolved}</dt>
                  <dd>Items left unresolved</dd>
                </div>
                <div>
                  <dt>{trace.derivedFindings}</dt>
                  <dd>Bounded derived findings</dd>
                </div>
              </dl>
              <div className="trace-run-note">
                <strong>Extraction path</strong>
                <p>
                  {result?.metadata.provider_outcome ===
                  'retained_validated_snapshot'
                    ? `Retained validated extraction loaded from ${result.metadata.demo_fixture?.source_run ?? 'the saved synthetic evaluation'}; no provider call was made.`
                    : result?.metadata.provider_outcome ===
                        'reused_validated_extraction'
                      ? 'Previously validated extraction reused; downstream reasoning was regenerated without a provider call.'
                      : `Live provider extraction${
                          result?.metadata.provider_metrics?.http_attempts ==
                          null
                            ? ''
                            : ` · ${result.metadata.provider_metrics.http_attempts} HTTP attempt${
                                result.metadata.provider_metrics
                                  .http_attempts === 1
                                  ? ''
                                  : 's'
                              }`
                        }${
                          result?.metadata.provider_metrics?.repair_attempts
                            ? ` · ${result.metadata.provider_metrics.repair_attempts} repair`
                            : ''
                        }.`}
                </p>
              </div>
              <p className="technical-trace-note">
                Exact source restoration proves where text came from; it does
                not prove that every interpretation is correct.
              </p>
            </details>
          )}

          <details className="claim-details">
            <summary>View claim details and analysis history</summary>
            {!!result?.revisions.length && (
              <label className="revision-picker">
                Saved analysis version
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
                  {result.revisions.map((revision, index) => (
                    <option key={revision} value={revision}>
                      Version {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <h3>Claim amounts</h3>
            <p className="muted">
              Related claims are kept separate and never combined into one debt.
            </p>
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
                {money(bill.balance_cents)} as of {display(bill.statement_date)}
                . Not added to the EOB amount.{' '}
                {citations(bill.balance_cents.evidence_ids)}
              </p>
            ))}
            <h3>All findings</h3>
            {claim.conclusions.map((conclusion) => (
              <article className="page" key={conclusion.id}>
                <span className="finding-type">
                  {conclusion.classification.replaceAll('_', ' ')}
                </span>
                <p>{conclusion.text}</p>
                {citations(conclusion.evidence_ids)}
              </article>
            ))}
          </details>
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
            {evidence.domain === 'user_answer'
              ? 'User-reported information'
              : evidence.source_url
                ? 'External guidance'
                : 'Uploaded document'}
            {evidence.location.section &&
              ` · ${evidence.location.section.split('|').at(-1)?.trim()}`}
          </p>
          {evidence.text_kind === 'verbatim' ? (
            <blockquote>
              {evidence.text.replace(/^[A-Z]\d+\s*\|\s*/, '')}
            </blockquote>
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
          <aside className="evidence-note">
            <strong>Evidence, not a verdict</strong>
            <p>
              ClaimBridge shows the source behind each fact so you can verify it
              before taking action.
            </p>
          </aside>
        </section>
      )}
    </section>
  );
}
