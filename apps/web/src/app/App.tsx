import { apiRequest } from '../lib/api/client';
import { useCallback, useEffect, useState } from 'react';

import { ClaimWorkflow } from '../features/analysis/ClaimWorkflow';
import { documentTypeLabel } from '../features/analysis/presentation';
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
  const [stage, setStage] = useState<'documents' | 'analysis' | 'appeal'>(
    'documents',
  );
  const [recentCases, setRecentCases] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('claimbridge.recent-workspaces') ?? '[]',
      ) as string[];
    } catch {
      return [];
    }
  });

  const rememberWorkspace = useCallback((id: string) => {
    setRecentCases((current) => {
      const next = [id, ...current.filter((item) => item !== id)].slice(0, 5);
      localStorage.setItem(
        'claimbridge.recent-workspaces',
        JSON.stringify(next),
      );
      return next;
    });
  }, []);

  async function openWorkspace(id: string) {
    setBusy(true);
    setError('');
    try {
      const state = await request(`/workspaces/${id}`);
      setWorkspace(state);
      setSelected(null);
      setStage('documents');
      localStorage.setItem('claimbridge.workspace', state.id);
      rememberWorkspace(state.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Case unavailable.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const id = localStorage.getItem('claimbridge.workspace');
    if (!id) return;
    let active = true;
    request(`/workspaces/${id}`)
      .then((value) => {
        if (active) setWorkspace(value);
        if (active) rememberWorkspace(value.id);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [rememberWorkspace]);

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
        rememberWorkspace(current.id);
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
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">
          ClaimBridge<span>Medical claim review</span>
        </a>
        <div className="header-meta">
          {workspace && <span>Case {workspace.id.slice(0, 12)}</span>}
          <span>Saved on this device</span>
          <a className="technical-entry" href="/evaluation">
            Technical evaluation
          </a>
          <a href="/diagnostics">Help</a>
          <button
            className="text-button"
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
                  setStage('documents');
                  localStorage.setItem('claimbridge.workspace', state.id);
                  rememberWorkspace(state.id);
                })
                .catch((reason: Error) => setError(reason.message));
            }}
          >
            New case
          </button>
        </div>
      </header>
      {import.meta.env.DEV && recentCases.length > 0 && (
        <aside className="demo-tools" aria-label="Demo controls">
          <div>
            <strong>Demo controls</strong>
            <span>
              Reopen a locally saved synthetic case without rerunning analysis.
            </span>
          </div>
          <select
            aria-label="Reopen a recent synthetic case"
            value=""
            disabled={busy}
            onChange={(event) => {
              if (event.target.value) void openWorkspace(event.target.value);
            }}
          >
            <option value="">Reopen recent synthetic case</option>
            {recentCases.map((id, index) => (
              <option key={id} value={id}>
                Saved case {index + 1} · {id.slice(0, 8)}
              </option>
            ))}
          </select>
        </aside>
      )}
      <nav className="claim-progress" aria-label="Claim review progress">
        {[
          ['documents', 'Add documents'],
          ['analysis', 'Review claim'],
          ['appeal', 'Prepare appeal'],
        ].map(([key, label], index) => (
          <div
            className={`${stage === key ? 'current' : ''} ${
              ['analysis', 'appeal'].indexOf(stage) > index - 1
                ? 'complete'
                : ''
            }`}
            key={key}
            aria-current={stage === key ? 'step' : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </div>
        ))}
      </nav>
      {stage === 'documents' && (
        <section className="screen-heading">
          <p className="kicker">Document upload and review</p>
          <h1>Understand why your medical claim was denied</h1>
          <p>
            Upload your denial, EOB, insurance plan, and related bills.
            ClaimBridge compares them and shows what the evidence supports.
          </p>
        </section>
      )}
      {stage === 'documents' && (
        <div className="workspace">
          <aside>
            <section className="panel">
              <h2>Add PDF documents</h2>
              <p className="muted">Up to 100 pages and 20 MB per file.</p>
              <ul className="document-types" aria-label="Recommended documents">
                <li>Denial letter</li>
                <li>Explanation of Benefits</li>
                <li>Insurance plan</li>
                <li>Medical bill</li>
                <li>Supporting records</li>
              </ul>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />{' '}
                I’m using demonstration documents with no real patient data.
              </label>
              <label
                className={`upload ${!confirmed || busy ? 'disabled' : ''}`}
              >
                {busy ? 'Adding documents…' : 'Choose PDF files'}
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
                {!!workspace?.documents.length && (
                  <h3>
                    Documents <span>{workspace.documents.length}</span>
                  </h3>
                )}
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
                    <strong>{documentTypeLabel(item.document.filename)}</strong>
                    <span>
                      {item.document.filename} · {item.document.pages ?? '—'}{' '}
                      pages · Ready
                    </span>
                  </button>
                ))}
              </div>
              {!workspace?.documents.length && (
                <p className="empty">Your documents will appear here.</p>
              )}
            </section>
          </aside>
          <section className="panel viewer">
            <div className="viewer-heading">
              <div>
                <p className="kicker">Selected document</p>
                <h2>{entry?.document.filename ?? 'Review a document'}</h2>
              </div>
              {entry && workspace && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/v1/workspaces/${workspace.id}/documents/${entry.document.id}/content`}
                >
                  Open original PDF
                </a>
              )}
            </div>
            {entry ? (
              <>
                <p className="muted">
                  Extracted text keeps page references. Use the original PDF to
                  check tables, formatting, and signatures.
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
                <div className="document-placeholder" aria-hidden="true" />
                <h2>Add your first document</h2>
                <p>
                  Start with the denial letter or explanation of benefits. You
                  can add more documents before analysis.
                </p>
                <p className="muted">This case is saved on this device.</p>
              </div>
            )}
          </section>
        </div>
      )}
      {workspace && (
        <ClaimWorkflow
          key={workspace.id}
          workspace={workspace}
          onWorkspace={setWorkspace}
          stage={stage}
          onStage={setStage}
        />
      )}
      <footer className="site-footer">
        <span>ClaimBridge does not submit claims or appeals.</span>
        <span>
          {workspace
            ? `Case revision ${workspace.revision}`
            : 'Local demonstration'}
        </span>
      </footer>
    </main>
  );
}
