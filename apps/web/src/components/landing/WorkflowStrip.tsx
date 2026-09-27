const steps = [
  ['01', 'Documents', 'Denial, EOB, policy, records'],
  ['02', 'Evidence', 'Extract claims and sources'],
  ['03', 'Connections', 'Compare policy and evidence'],
  ['04', 'Action', 'Understand what to do next'],
];

export function WorkflowStrip() {
  return (
    <section className="landing-workflow" aria-labelledby="workflow-title">
      <div className="workflow-heading">
        <p>Traceable by design</p>
        <h2 id="workflow-title">From documents to a defensible next step.</h2>
      </div>
      <ol>
        {steps.map(([number, title, detail]) => (
          <li key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
