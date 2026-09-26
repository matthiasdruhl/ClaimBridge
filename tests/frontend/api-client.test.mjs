import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, flush, initTelemetry } from '../../apps/web/src/lib/api/client.ts';

test('records outcomes, correlates headers, and retries without recursive telemetry', async () => {
  const realFetch = globalThis.fetch;
  const realInterval = globalThis.setInterval;
  globalThis.window = { addEventListener() {} };
  globalThis.document = { hidden: false };
  globalThis.setInterval = () => 0;
  const batches = [];
  let mode = 'ok';
  let requestId;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/diagnostics/status')) return new Response('{}');
    if (url.endsWith('/diagnostics/events')) {
      batches.push(JSON.parse(options.body).events);
      return new Response(null, { status: 204 });
    }
    requestId = options.headers.get('X-Request-ID');
    if (mode === 'network') throw new TypeError('failed');
    if (mode === 'timeout') throw new DOMException('timeout', 'TimeoutError');
    if (mode === 'invalid') return new Response('not json');
    if (mode === 'http') return new Response('proxy error', { status: 502 });
    return new Response('{}');
  };
  try {
    initTelemetry();
    await new Promise((resolve) => setImmediate(resolve));
    for (mode of ['ok', 'network', 'timeout', 'invalid', 'http']) {
      if (mode === 'ok') await apiRequest('/workspaces/x', {}, () => true);
      else await assert.rejects(apiRequest('/workspaces/x', {}, () => true));
      await new Promise((resolve) => setImmediate(resolve));
      await flush();
    }
    const events = batches.flat();
    assert.deepEqual(events.map((event) => event.outcome), ['completed', 'network_error', 'timeout', 'invalid_response', 'http_error']);
    assert.equal(events.at(-1).request_id, requestId);
    assert.equal(events.length, 5);
  } finally {
    globalThis.fetch = realFetch;
    globalThis.setInterval = realInterval;
  }
});
