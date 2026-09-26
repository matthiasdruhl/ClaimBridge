import { apiRequest } from '../lib/api/client';
import { useEffect, useState } from 'react';

import { ClaimWorkflow } from '../features/analysis/ClaimWorkflow';
import { isWorkspace } from '../lib/contracts/workflow';
import type { Workspace } from '../lib/contracts/workflow';

async function request(
  path: string,
  options?: RequestInit,
): Promise<Workspace> {
  return apiRequest(path, options, isWorkspace);
}

export function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('claimbridge.workspace');
    if (!id) return;
    let active = true;
    request(`/workspaces/${id}`)
      .then((value) => {
        if (active) setWorkspace(value);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length || !confirmed) return;
    const selectedFiles = Array.from(files);
    setBusy(true);
    setError('');
    let current = workspace;
    try {
      if (!current) {
        current = await request('/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ synthetic: true }),
        });
        localStorage.setItem('claimbridge.workspace', current.id);
        setWorkspace(current);
      }
      for (const file of selectedFiles) {
        const form = new FormData();
        form.append('file', file);
        form.append('expected_revision', String(current.revision));
        current = await request(`/workspaces/${current.id}/documents`, {
          method: 'POST',
          body: form,
        });
        setWorkspace(current);
        setSelected(current.documents.at(-1)?.document.id ?? null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
      if (current) {
        try {
          setWorkspace(await request(`/workspaces/${current.id}`));
        } catch {
          /* Keep prior state. */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const entry =
    workspace?.documents.find((item) => item.document.id === selected) ??
    workspace?.documents[0];
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ClaimBridge<span>Evidence before answers.</span>
        </a>
        <a href="#claim-analysis">Claim analysis</a>
        <a href="/diagnostics">Diagnostics</a>
        <button
          disabled={busy}
          onClick={() => {
            setError('');
            void request('/workspaces', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ synthetic: true }),
            })
              .then((state) => {
                setWorkspace(state);
                setSelected(null);
                localStorage.setItem('claimbridge.workspace', state.id);
              })
              .catch((reason: Error) => setError(reason.message));
          }}
        >
          New workspace
        </button>
        <span className="badge">LOCAL DEMO · SYNTHETIC DATA</span>
      </header>
      <section className="intro">
        <p className="eyebrow">YOUR CLAIM WORKSPACE</p>
        <h1>Make sense of the paperwork.</h1>
        <p>
          Bring your plan, explanation of benefits, denial, and bill together.
          Start by reviewing what each document actually says.
        </p>
      </section>
      <div className="workspace">
        <aside>
          <section className="panel">
            <h2>
              Documents{' '}
              <span className="count">{workspace?.documents.length ?? 0}</span>
            </h2>
            <p className="muted">
              Text PDFs · up to 100 pages · under 20 MB per upload
            </p>
            <label className="consent">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />{' '}
              These are synthetic demonstration documents.
            </label>
            <label className={`upload ${!confirmed || busy ? 'disabled' : ''}`}>
              {busy ? 'Extracting pages…' : '+ Add PDFs'}
              <input
                aria-label="Add synthetic PDF documents"
                type="file"
                accept="application/pdf"
                multiple
                disabled={!confirmed || busy}
                onChange={(event) => {
                  void upload(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="documents">
              {workspace?.documents.map((item) => (
                <button
                  key={item.document.id}
                  className={
                    entry?.document.id === item.document.id
                      ? 'document active'
                      : 'document'
                  }
                  onClick={() => setSelected(item.document.id)}
                >
                  <strong>{item.document.filename}</strong>
                  <span>
                    {item.document.pages ?? '—'} pages ·{' '}
                    {item.document.status.replaceAll('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
            {!workspace?.documents.length && (
              <p className="empty">Your uploaded documents will appear here.</p>
            )}
          </section>
        </aside>
        <section className="panel viewer">
          <div className="viewer-heading">
            <div>
              <p className="eyebrow">SOURCE DOCUMENT</p>
              <h2>
                {entry?.document.filename ?? 'A clear view of your evidence'}
              </h2>
            </div>
            {entry && workspace && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`/api/v1/workspaces/${workspace.id}/documents/${entry.document.id}/content`}
              >
                Open original ↗
              </a>
            )}
          </div>
          {entry ? (
            <>
              <p className="muted">
                Extracted text preserves page references. Check the original for
                tables and visual layout.
              </p>
              {entry.document.status === 'encrypted' && (
                <p className="error">
                  This PDF is encrypted. Upload an unlocked copy.
                </p>
              )}
              {entry.pages.map((page) => (
                <article className="page" key={page.id}>
                  <h3>Page {page.page}</h3>
                  <pre>
                    {page.text ||
                      'No extractable text on this page. An OCR-capable workflow is needed.'}
                  </pre>
                </article>
              ))}
            </>
          ) : (
            <div className="welcome">
              <div className="paper-icon">≡</div>
              <h2>Every answer starts with a source.</h2>
              <p>
                Upload the initial five demo documents to begin. Save the
                location confirmation for the later clarification step.
              </p>
              <p className="muted">Your workspace is saved on this computer.</p>
            </div>
          )}
        </section>
      </div>
      {workspace && (
        <ClaimWorkflow
          key={workspace.id}
          workspace={workspace}
          onWorkspace={setWorkspace}
        />
      )}
      <footer>
        ClaimBridge · Local hackathon build{' '}
        <span>
          {workspace
            ? `Workspace revision ${workspace.revision}`
            : 'Ready for your first document'}
        </span>
      </footer>
    </main>
  );
}
