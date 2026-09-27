import { useCallback, useEffect, useRef, useState } from 'react';
import { flush } from '../../lib/api/client';
type Event = {
  seq: number;
  id: string;
  timestamp: number;
  source: string;
  severity: string;
  operation: string;
  request_id: string;
  status: number | null;
  duration_ms: number | null;
  outcome: string;
  job_id?: string | null;
  stage?: string | null;
};
type Health = {
  status: string;
  database: string;
  logging: string;
  uptime_seconds: number;
  metrics: { requests: number; errors: number } | null;
};
export function Dashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [connection, setConnection] = useState('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [last, setLast] = useState('Never');
  const [events, setEvents] = useState<Event[]>([]);
  const [source, setSource] = useState('');
  const [severity, setSeverity] = useState('');
  const [requestId, setRequestId] = useState('');
  const [selected, setSelected] = useState('');
  const [paused, setPaused] = useState(false);
  const [logError, setLogError] = useState('');
  const cursor = useRef(0);
  const checking = useRef(false);
  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    const start = performance.now();
    try {
      const response = await fetch('/api/v1/diagnostics/status', {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error();
      const result = (await response.json()) as Health;
      if (!['connected', 'degraded'].includes(result.status)) throw new Error();
      setHealth(result);
      setConnection(result.status);
      setLatency(Math.round(performance.now() - start));
      setLast(new Date().toLocaleTimeString());
      void flush();
    } catch {
      setConnection('unreachable');
    } finally {
      checking.current = false;
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      void check();
    }, 0);
    const interval = setInterval(() => {
      if (!document.hidden) void check();
    }, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [check]);
  useEffect(() => {
    let active = true;
    let busy = false;
    async function poll() {
      if (paused || busy || document.hidden) return;
      busy = true;
      try {
        const response = await fetch(
          `/api/v1/diagnostics/events?after=${cursor.current}`,
          { signal: AbortSignal.timeout(3000) },
        );
        if (!response.ok) throw new Error();
        const result = (await response.json()) as {
          events: Event[];
          cursor: number;
        };
        if (!Array.isArray(result.events) || typeof result.cursor !== 'number')
          throw new Error();
        if (active) {
          cursor.current = result.cursor;
          setEvents((previous) =>
            Array.from(
              new Map(
                [...previous, ...result.events].map((event) => [
                  event.id,
                  event,
                ]),
              ).values(),
            ).slice(-10000),
          );
          setLogError('');
        }
      } catch {
        if (active)
          setLogError(
            'Event feed unavailable. Displayed history may be stale.',
          );
      } finally {
        busy = false;
      }
    }
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paused]);
  const visible = events
    .filter(
      (event) =>
        (!source || event.source === source) &&
        (!severity || event.severity === severity) &&
        (!requestId || event.request_id.includes(requestId)),
    )
    .reverse();
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ClaimBridge<span>Developer diagnostics</span>
        </a>
        <a href="/">← Claim workspace</a>
      </header>
      <section className="intro">
        <p className="eyebrow">LOCAL OBSERVABILITY</p>
        <h1>See what’s happening.</h1>
        <p>
          Trace browser requests through the API and PDF extraction. Metadata
          only; document contents stay out of logs.
        </p>
      </section>
      <section className="diagnostic-cards" aria-live="polite">
        <div className="panel">
          <h2>Browser → API</h2>
          <p className={`connection ${connection}`}>{connection}</p>
          <p className="muted">
            Last success: {last}
            {connection === 'unreachable' ? ' · stale' : ''}
          </p>
          <button onClick={() => void check()}>Check now</button>
        </div>
        <div className="panel">
          <h2>Round trip</h2>
          <p className="metric">{latency === null ? '—' : `${latency} ms`}</p>
          <p className="muted">
            {connection === 'unreachable'
              ? 'Last known measurement'
              : 'Through the frontend API proxy'}
          </p>
        </div>
        <div className="panel">
          <h2>Backend readiness</h2>
          <p>
            Database: {health?.database ?? 'unknown'}
            <br />
            Logging: {health?.logging ?? 'unknown'}
          </p>
          <p className="muted">
            Uptime: {health?.uptime_seconds ?? '—'} seconds{' '}
            {connection === 'unreachable' && '· stale'}
          </p>
        </div>
        <div className="panel">
          <h2>Last 15 minutes</h2>
          <p className="metric">{health?.metrics?.requests ?? '—'} requests</p>
          <p className="muted">
            {health?.metrics?.errors ?? '—'} HTTP errors · excludes diagnostics{' '}
            {connection === 'unreachable' && '· stale'}
          </p>
        </div>
      </section>
      {connection === 'unreachable' && (
        <p role="alert" className="error">
          Cannot reach diagnostics. Check that the backend is running with make
          dev-api. The API, proxy, or diagnostics configuration may be
          unavailable.
        </p>
      )}
      <section className="panel">
        <div className="viewer-heading">
          <h2>Event stream</h2>
          <button onClick={() => setPaused(!paused)}>
            {paused ? 'Resume updates' : 'Pause updates'}
          </button>
        </div>
        <div className="filters">
          <label>
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="">All</option>
              <option>frontend</option>
              <option>backend</option>
            </select>
          </label>
          <label>
            Severity
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option value="">All</option>
              <option>info</option>
              <option>warning</option>
              <option>error</option>
            </select>
          </label>
          <label>
            Request ID
            <input
              value={requestId}
              onChange={(event) => setRequestId(event.target.value)}
              placeholder="Filter by request ID"
            />
          </label>
        </div>
        {logError && (
          <p role="status" className="error">
            {logError}
          </p>
        )}
        <p className="muted">
          24-hour retention · maximum 10,000 events ·{' '}
          {paused ? 'Updates paused' : 'Refreshes every 2 seconds'} · latest 300
          matching events shown
        </p>
        <div className="event-table">
          <table>
            <thead>
              <tr>
                {[
                  'Time',
                  'Source',
                  'Severity',
                  'Operation',
                  'Outcome',
                  'Job / stage',
                  'HTTP',
                  'Duration',
                  'Request',
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 300).map((event) => (
                <tr key={event.id}>
                  <td>
                    {new Date(event.timestamp * 1000).toLocaleTimeString()}
                  </td>
                  <td>{event.source}</td>
                  <td>{event.severity}</td>
                  <td>{event.operation}</td>
                  <td>{event.outcome}</td>
                  <td title={event.job_id ?? undefined}>
                    {event.job_id?.slice(0, 8) ?? '—'} {event.stage ?? ''}
                  </td>
                  <td>{event.status ?? '—'}</td>
                  <td>
                    {event.duration_ms == null
                      ? '—'
                      : `${event.duration_ms} ms`}
                  </td>
                  <td>
                    <button
                      title={event.request_id}
                      onClick={() => setSelected(event.request_id)}
                    >
                      {event.request_id.slice(0, 8)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <p className="empty">
            No matching events yet. Use the claim workspace to generate
            activity.
          </p>
        )}
      </section>
      {selected && (
        <section className="panel trace">
          <div className="viewer-heading">
            <h2>Request trace</h2>
            <button onClick={() => setSelected('')}>Close</button>
          </div>
          <p className="trace-id">{selected}</p>
          {events
            .filter((event) => event.request_id === selected)
            .map((event) => (
              <p key={event.id}>
                {new Date(event.timestamp * 1000).toLocaleTimeString()} ·{' '}
                {event.source} · {event.operation} · {event.outcome}{' '}
                {event.duration_ms != null && `· ${event.duration_ms} ms`}
              </p>
            ))}
          <p className="muted">
            Shows events received so far; pending browser events appear after
            reconnection.
          </p>
        </section>
      )}
    </main>
  );
}
