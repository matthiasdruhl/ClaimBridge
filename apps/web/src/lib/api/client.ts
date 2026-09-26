type Event = {
  id: string;
  request_id: string;
  operation: string;
  outcome: string;
  status?: number | undefined;
  duration_ms?: number;
};
const pending: Event[] = [];
let sending = false;
let enabled = false;
export function record(event: Omit<Event, 'id'>) {
  pending.push({ ...event, id: crypto.randomUUID() });
  if (pending.length > 200) pending.shift();
}
export async function flush() {
  if (!enabled || sending || !pending.length) return;
  sending = true;
  const batch = pending.slice(0, 50);
  try {
    const response = await fetch('/api/v1/diagnostics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const ids = new Set(batch.map((event) => event.id));
      for (let index = pending.length - 1; index >= 0; index--)
        if (ids.has(pending[index]?.id ?? '')) pending.splice(index, 1);
    }
  } catch {
    /* Retain bounded queue until connection recovers. */
  } finally {
    sending = false;
  }
}
export function initTelemetry() {
  const failure = () =>
    record({
      request_id: crypto.randomUUID(),
      operation: 'app.failure',
      outcome: 'uncaught',
    });
  window.addEventListener('error', failure);
  window.addEventListener('unhandledrejection', failure);
  const tick = async () => {
    if (document.hidden) return;
    if (!enabled) {
      try {
        enabled = (
          await fetch('/api/v1/diagnostics/status', {
            signal: AbortSignal.timeout(3000),
          })
        ).ok;
      } catch {
        return;
      }
    }
    await flush();
  };
  void tick();
  setInterval(() => {
    void tick();
  }, 5000);
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  validate: (value: unknown) => value is T,
): Promise<T> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  const operation = path.endsWith('/documents')
    ? 'document.upload'
    : options.method === 'POST'
      ? 'workspace.create'
      : 'workspace.read';
  const headers = new Headers(options.headers);
  headers.set('X-Request-ID', requestId);
  let status: number | undefined;
  let outcome = 'completed';
  try {
    const response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      signal: options.signal ?? AbortSignal.timeout(60000),
    });
    status = response.status;
    if (!response.ok) {
      outcome = 'http_error';
      let message = `Request failed (${status}).`;
      try {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        message = body.error?.message ?? message;
      } catch {
        /* Proxy may return HTML. */
      }
      throw new Error(`${message} Request ID: ${requestId}`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      outcome = 'invalid_response';
      throw new Error('The server returned an unreadable response.');
    }
    if (!validate(body)) {
      outcome = 'invalid_response';
      throw new Error('Unexpected response format.');
    }
    return body;
  } catch (error) {
    if (outcome === 'completed')
      outcome =
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'timeout'
          : 'network_error';
    throw error;
  } finally {
    record({
      request_id: requestId,
      operation,
      outcome,
      status,
      duration_ms: Math.round(performance.now() - started),
    });
    void flush();
  }
}
