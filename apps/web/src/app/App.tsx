import { apiRequest } from '../lib/api/client';
import { useEffect, useState } from 'react';

import { ClaimWorkflow } from '../features/analysis/ClaimWorkflow';
import { LandingHero } from '../components/landing/LandingHero';
import { documentTypeLabel } from '../features/analysis/presentation';
import { isJob, isWorkspace } from '../lib/contracts/workflow';
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
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(
    () => localStorage.getItem('claimbridge.demo-mode') === 'true',
  );
  const [stage, setStage] = useState<'documents' | 'analysis' | 'appeal'>(
    'documents',
  );
  useEffect(() => {
    const developmentWorkspace = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get('workspace')
      : null;
    const id =
      developmentWorkspace ?? localStorage.getItem('claimbridge.workspace');
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

  async function upload(
    files: FileList | File[] | null,
    existingCase = false,
  ): Promise<Workspace | null> {
    if (!files?.length || (!confirmed && !existingCase)) return null;
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
      return current;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
      if (current) {
        try {
          setWorkspace(await request(`/workspaces/${current.id}`));
        } catch {
          /* Keep prior state. */
        }
      }
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  async function exploreDemo() {
    setBusy(true);
    setError('');
    try {
      const state = await request('/workspaces/demo', { method: 'POST' });
      setWorkspace(state);
      setSelected(state.documents[0]?.document.id ?? null);
      setDemoMode(true);
      localStorage.setItem('claimbridge.workspace', state.id);
      localStorage.setItem('claimbridge.demo-mode', 'true');
      await apiRequest(
        `/workspaces/${state.id}/process`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expected_revision: state.revision,
            document_ids: state.documents.map((item) => item.document.id),
            demo_mode: true,
          }),
        },
        isJob,
      );
      setStage('analysis');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'The demo could not be opened.',
      );
    } finally {
      setBusy(false);
    }
  }

  const entry =
    workspace?.documents.find((item) => item.document.id === selected) ??
    workspace?.documents[0];
  const hasDocuments = !!workspace?.documents.length;
  const landing = stage === 'documents' && !hasDocuments;
  const showDocumentWorkspace =
    stage === 'documents' && (!landing || documentsOpen);
  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">
          ClaimBridge<span>Medical claim review</span>
        </a>
        <div className="header-meta">
          {hasDocuments && <span>Case {workspace?.id.slice(0, 12)}</span>}
          {hasDocuments && <span>Saved on this device</span>}
          <a className="technical-entry" href="/evaluation">
            Technical evaluation
          </a>
          <a href="/diagnostics">Help</a>
          <label className={`header-demo-toggle ${demoMode ? 'active' : ''}`}>
            <span className="demo-dot" aria-hidden="true" />
            Demo
            <input
              aria-label="Demo mode"
              type="checkbox"
              checked={demoMode}
              onChange={(event) => {
                const enabled = event.target.checked;
                setDemoMode(enabled);
                localStorage.setItem('claimbridge.demo-mode', String(enabled));
              }}
            />
          </label>
          <button
            className="text-button"
            disabled={busy}
            hidden={!hasDocuments}
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
                  setDocumentsOpen(true);
                  localStorage.setItem('claimbridge.workspace', state.id);
                })
                .catch((reason: Error) => setError(reason.message));
            }}
          >
            New case
          </button>
        </div>
      </header>
      {demoMode && hasDocuments && (
        <aside className="demo-status" aria-label="Demo mode" role="status">
          <span>
            <i aria-hidden="true" /> Demo mode
          </span>
          Validated synthetic case
        </aside>
      )}
      {landing && (
        <LandingHero
          busy={busy}
          error={error}
          onDemo={() => void exploreDemo()}
          onDocuments={() => {
            setDemoMode(false);
            localStorage.setItem('claimbridge.demo-mode', 'false');
            setDocumentsOpen(true);
            window.setTimeout(() => {
              document
                .getElementById('document-workspace')
                ?.scrollIntoView({ behavior: 'smooth' });
            }, 0);
          }}
        />
      )}
      {(!landing || documentsOpen) && (
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
      )}
      {showDocumentWorkspace && (
        <section className="screen-heading" id="document-workspace">
          <p className="kicker">Document upload and review</p>
          <h1>Understand why your medical claim was denied</h1>
          <p>
            Upload your denial, EOB, insurance plan, and related bills.
            ClaimBridge compares them and shows what the evidence supports.
          </p>
        </section>
      )}
      {showDocumentWorkspace && (
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
                    void upload(event.target.files).catch(() => undefined);
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
      {workspace && (!landing || documentsOpen) && (
        <ClaimWorkflow
          key={workspace.id}
          workspace={workspace}
          onWorkspace={setWorkspace}
          stage={stage}
          onStage={setStage}
          demoMode={demoMode}
          onUpload={(files) => upload(files, true)}
        />
      )}
      <footer className="site-footer">
        <span>ClaimBridge does not submit claims or appeals.</span>
        <span>
          {hasDocuments
            ? `Case revision ${workspace.revision}`
            : 'Local demonstration'}
        </span>
      </footer>
    </main>
  );
}
