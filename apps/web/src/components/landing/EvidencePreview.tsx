const sources = [
  {
    className: 'source-denial',
    type: 'Denial',
    title: 'Network exclusion',
    meta: 'Submitted as office',
  },
  {
    className: 'source-plan',
    type: 'Plan',
    title: 'Protected facility',
    meta: 'Section 8 exception',
  },
  {
    className: 'source-eob',
    type: 'EOB',
    title: 'Related facility claim',
    meta: 'Same date of service',
  },
  {
    className: 'source-review',
    type: 'Authorization',
    title: 'Surgery center',
    meta: 'Prior review record',
  },
];

export function EvidencePreview() {
  return (
    <figure
      className="evidence-preview"
      aria-labelledby="evidence-preview-title"
    >
      <figcaption id="evidence-preview-title" className="visually-hidden">
        Example evidence map connecting a denial, health plan, explanation of
        benefits, and authorization to a review finding about a possible
        service-location conflict.
      </figcaption>
      <div className="preview-toolbar">
        <span>
          <i aria-hidden="true" /> Live evidence analysis
        </span>
        <span>Example · synthetic</span>
      </div>
      <div className="evidence-canvas">
        <svg
          className="evidence-lines"
          viewBox="0 0 700 470"
          aria-hidden="true"
        >
          <path className="line line-1" d="M126 102 C205 105 213 172 302 188" />
          <path className="line line-2" d="M126 203 C208 203 221 203 302 203" />
          <path className="line line-3" d="M574 112 C497 120 473 172 398 190" />
          <path className="line line-4" d="M574 218 C492 216 475 211 398 205" />
          <path
            className="line line-accent"
            d="M350 230 C350 260 350 268 350 294"
          />
          <path
            className="line line-accent"
            d="M350 346 C350 365 350 372 350 390"
          />
        </svg>
        <p className="canvas-label">Source documents</p>
        {sources.map((source, index) => (
          <article
            className={`source-node ${source.className}`}
            key={source.type}
            style={{ '--node-order': index } as React.CSSProperties}
          >
            <span>{source.type}</span>
            <strong>{source.title}</strong>
            <small>{source.meta}</small>
          </article>
        ))}
        <article className="evidence-node core-node">
          <span>Structured evidence</span>
          <strong>Service location</strong>
          <small>
            <i aria-hidden="true" /> Conflicting records
          </small>
        </article>
        <article className="conflict-node">
          <span>Evidence conflict</span>
          <strong>Office code ↔ surgical-center record</strong>
        </article>
        <article className="preview-finding">
          <div>
            <span>Review finding</span>
            <strong>Potential processing mismatch</strong>
          </div>
          <p>
            The denial classification may not align with the available encounter
            evidence.
          </p>
          <div className="finding-sources">
            <span>Supported by</span>
            <b>Plan §8</b>
            <b>EOB</b>
            <b>Authorization</b>
          </div>
        </article>
      </div>
    </figure>
  );
}
