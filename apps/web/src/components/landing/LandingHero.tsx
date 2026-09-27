import { EvidencePreview } from './EvidencePreview';
import { WorkflowStrip } from './WorkflowStrip';

export function LandingHero({
  busy,
  error,
  onDemo,
  onDocuments,
}: {
  busy: boolean;
  error: string;
  onDemo: () => void;
  onDocuments: () => void;
}) {
  return (
    <div className="landing-entry">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="hero-kicker">Health insurance claim intelligence</p>
          <h1 id="landing-title">
            See the evidence behind an insurance denial.
          </h1>
          <p className="hero-lede">
            ClaimBridge connects your denial, insurance policy, medical
            evidence, and coverage rules into one traceable analysis—showing
            what the evidence supports and what could strengthen an appeal.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button hero-primary"
              disabled={busy}
              onClick={onDemo}
            >
              {busy ? 'Opening demo…' : 'Explore the demo'}
            </button>
            <button
              className="hero-secondary"
              disabled={busy}
              onClick={onDocuments}
            >
              Use my documents <span aria-hidden="true">↓</span>
            </button>
          </div>
          <p className="demo-assurance">
            <span aria-hidden="true">✓</span> Preloaded synthetic case <i /> No
            patient data
          </p>
          {error && (
            <p className="error hero-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <EvidencePreview />
      </section>
      <WorkflowStrip />
    </div>
  );
}
