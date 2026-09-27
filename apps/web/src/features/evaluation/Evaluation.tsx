import { evaluationRuns, evaluationSummary, workflowRuns } from './data';

const stages = [
  [
    'Insurance documents',
    'PDFs are separated into page-level source passages.',
  ],
  [
    'Structured extraction',
    'The model identifies claims, amounts, dates, settings, and plan language.',
  ],
  [
    'Evidence selection',
    'The model returns source passage identifiers, not rewritten quotations.',
  ],
  [
    'Source verification',
    'The server restores exact text, page, offsets, and document identity.',
  ],
  [
    'Bounded reasoning',
    'Validated facts enter claim-specific rules that preserve conflicts and unknowns.',
  ],
  [
    'Action',
    'Deterministic templates produce next steps and an editable, unsubmitted appeal.',
  ],
];

const summary = evaluationSummary(evaluationRuns);

export function Evaluation() {
  return (
    <main className="technical-shell">
      <header className="site-header technical-header">
        <a className="brand" href="/">
          ClaimBridge<span>Medical claim review</span>
        </a>
        <nav aria-label="Technical page navigation">
          <a href="/">Patient view</a>
          <a href="#evaluation">Evaluation results</a>
        </nav>
      </header>

      <section className="technical-hero">
        <p className="kicker">Technical evaluation · AI + evidence system</p>
        <h1>How ClaimBridge reasons from insurance documents</h1>
        <p className="technical-lede">
          LLMs extract structured facts and select evidence. ClaimBridge then
          restores and validates the source material before any finding is used.
        </p>
        <dl className="technical-answers">
          <div>
            <dt>What the model does</dt>
            <dd>Extracts claim structure and points to relevant passages.</dd>
          </div>
          <div>
            <dt>What becomes trusted</dt>
            <dd>
              Only schema-valid facts with existing, restored evidence
              references.
            </dd>
          </div>
          <div>
            <dt>How evidence stays traceable</dt>
            <dd>
              Every document source retains its exact text, page, offsets, and
              hash.
            </dd>
          </div>
          <div>
            <dt>How it was evaluated</dt>
            <dd>Repeated live runs over three synthetic claim scenarios.</dd>
          </div>
        </dl>
      </section>

      <section className="technical-section pipeline-section">
        <div className="technical-section-heading">
          <p className="kicker">The real pipeline</p>
          <h2>Documents become evidence before they become conclusions</h2>
        </div>
        <ol className="pipeline" aria-label="ClaimBridge analysis pipeline">
          {stages.map(([title, detail], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="technical-section grounding-section">
        <div className="technical-section-heading">
          <p className="kicker">The trust boundary</p>
          <h2>The model points to evidence. The application verifies it.</h2>
          <p>
            This example comes from the retained synthetic network scenario. It
            is not a real patient record.
          </p>
        </div>
        <div className="grounding-flow">
          <article>
            <span>Model output</span>
            <h3>Source passage selected</h3>
            <code>D4-P3-S3</code>
            <p>
              The response supplies an identifier, domain, and evidence kind.
            </p>
          </article>
          <article>
            <span>ClaimBridge validation</span>
            <h3>Reference checked</h3>
            <p>
              Schema, document ownership, page location, and exact source
              identity must match.
            </p>
          </article>
          <article className="restored-source">
            <span>Source restoration</span>
            <h3>Health plan · page 3</h3>
            <blockquote>
              “Covered non-emergency anesthesiology furnished by a
              nonparticipating provider during a visit to a participating
              hospital, hospital outpatient department or ambulatory surgical
              center…”
            </blockquote>
          </article>
          <article>
            <span>Bounded reasoning</span>
            <h3>Eligible to support a finding</h3>
            <p>
              The passage is considered with claim, setting, network, and
              plan-scope facts.
            </p>
          </article>
        </div>
        <p className="technical-caveat">
          Exact restoration proves provenance, not semantic correctness. Human
          review of applicability remains required.
        </p>
      </section>

      <section className="technical-section responsibility-section">
        <div className="technical-section-heading">
          <p className="kicker">Separated responsibilities</p>
          <h2>Not a PDFs → LLM → answer pipeline</h2>
        </div>
        <div className="responsibility-columns">
          <div>
            <h3>The model</h3>
            <ul>
              <li>Extracts structured claim information</li>
              <li>Selects potentially relevant numbered passages</li>
              <li>Classifies relationships needed by bounded reasoning</li>
            </ul>
          </div>
          <div>
            <h3>ClaimBridge outside the model</h3>
            <ul>
              <li>Restores immutable source text and validates references</li>
              <li>
                Keeps separate claims, EOBs, conflicts, and unknown values
                distinct
              </li>
              <li>Labels user reports separately from document evidence</li>
              <li>
                Calculates supported deadlines and generates bounded actions
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="technical-section evaluation-section" id="evaluation">
        <div className="technical-section-heading">
          <p className="kicker">
            Recorded synthetic evaluation · September 26, 2026
          </p>
          <h2>Validation results, including the repair</h2>
          <p>
            Live model runs covered the original network packet before and after
            location evidence, plus independent office and authorization cases.
          </p>
        </div>
        {summary ? (
          <>
            <dl className="evaluation-summary">
              <div>
                <dt>
                  {summary.passed} / {evaluationRuns.length}
                </dt>
                <dd>Automatic gates passed</dd>
              </div>
              <div>
                <dt>
                  {summary.firstPass} / {evaluationRuns.length}
                </dt>
                <dd>Passed first generation</dd>
              </div>
              <div>
                <dt>{summary.repaired}</dt>
                <dd>Rejected, repaired, then passed</dd>
              </div>
              <div>
                <dt>{summary.medianSeconds} s</dt>
                <dd>Median live analysis time</dd>
              </div>
            </dl>
            <div className="run-table-wrap">
              <table className="evaluation-runs">
                <caption>All 12 retained live runs</caption>
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Scenario</th>
                    <th>Validation</th>
                    <th>Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluationRuns.map((run) => (
                    <tr key={run.name}>
                      <th scope="row">{run.name}</th>
                      <td>{run.scenario}</td>
                      <td>
                        {run.repaired
                          ? 'Passed after repair'
                          : 'Passed first generation'}
                      </td>
                      <td>{run.seconds.toFixed(2)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="notice">Recorded evaluation data is unavailable.</p>
        )}
      </section>

      <section className="technical-section repair-section">
        <div className="technical-section-heading">
          <p className="kicker">A real retained failure path</p>
          <h2>When the first model output was invalid</h2>
        </div>
        <ol>
          <li>
            <strong>Generation</strong>
            <span>
              The final authorization run returned a duplicate evidence ID.
            </span>
          </li>
          <li>
            <strong>Validation</strong>
            <span>
              ClaimBridge rejected the candidate instead of saving a claim
              snapshot.
            </span>
          </li>
          <li>
            <strong>Repair</strong>
            <span>
              The provider received the prior candidate and constrained
              validation feedback.
            </span>
          </li>
          <li>
            <strong>Revalidation</strong>
            <span>The repaired result passed the automatic gate.</span>
          </li>
        </ol>
        <p className="technical-caveat">
          This demonstrates bounded rejection and repair; it does not claim that
          hallucinations are eliminated.
        </p>
      </section>

      <section className="technical-section regeneration-section">
        <div className="technical-section-heading">
          <p className="kicker">Clarification without re-extraction</p>
          <h2>Validated extraction can be reused</h2>
          <p>
            When documents and configuration are unchanged, a new user answer
            updates deterministic reasoning without another provider call.
          </p>
        </div>
        <div className="regeneration-flow">
          <span>Validated claim state</span>
          <i aria-hidden="true">→</i>
          <span>User-reported clarification</span>
          <i aria-hidden="true">→</i>
          <span>Recomputed finding and deadline</span>
        </div>
        <dl className="workflow-measurements">
          {workflowRuns.map((run) => (
            <div key={run.name}>
              <dt>{run.milliseconds} ms</dt>
              <dd>
                {run.name} · {run.providerCalls} provider calls
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="technical-section limitations-section">
        <div>
          <p className="kicker">Evaluation boundary</p>
          <h2>What these results do not establish</h2>
        </div>
        <p>
          These are synthetic repeatability and validation results—not clinical
          accuracy, insurer approval rates, appeal success, financial savings,
          or production reliability. Independent human citation review remains
          pending.
        </p>
      </section>

      <footer className="technical-footer">
        <a className="primary-button" href="/">
          Return to the patient experience
        </a>
        <span>Source report: docs/live-validation.md</span>
      </footer>
    </main>
  );
}
