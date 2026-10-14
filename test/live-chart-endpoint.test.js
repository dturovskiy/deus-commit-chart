'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLiveChartHandler, parseRequest } = require('../live-chart/handler');
const { createAssetBundle } = require('../build-activity-assets');
const { utcWindow } = require('../contribution-snapshot');

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>';
function req(url = '/api/chart?username=Example&days=365', headers = {}, method = 'GET') {
  return { method, url, headers };
}
async function invoke(handler, request = req()) {
  const headers = {};
  const res = {
    statusCode: 200,
    setHeader(key, value) { headers[key.toLowerCase()] = value; },
    end(body = '') { this.body = body; }
  };
  await handler(request, res);
  return { status: res.statusCode, headers, body: res.body };
}
function handler(options = {}) {
  return createLiveChartHandler({
    getToken: () => 'offline-fixture-only',
    source: async () => ({ sourceDetails: { type: 'github', username: 'example' } }),
    render: () => SVG,
    ...options
  });
}

test('canonicalizes username, constrains days and theme', () => {
  assert.deepEqual(parseRequest('/api/chart?username=Example&days=90&theme=github-light'),
    { username: 'example', days: 90, theme: 'github-light' });
  assert.deepEqual(parseRequest('/api/chart?username=a'),
    { username: 'a', days: 30, theme: 'github-compact' });
});

test('rejects duplicates, unknown query keys, invalid paths, usernames, and ranges', async () => {
  const h = handler();
  for (const url of [
    '/api/chart?username=valid&username=another',
    '/api/chart?username=valid&cache_bust=99',
    '/api/chart?username=%3Cscript%3E',
    '/api/chart?username=-bad',
    '/api/chart?username=valid&days=366',
    '/api/chart?username=valid&theme=unsafe',
    'https://evil.example/api/chart?username=valid',
    '/api/other?username=valid',
    '/api/chart?username='
  ]) {
    const x = await invoke(h, req(url));
    assert.equal(x.status, 400, url);
    assert.equal(x.headers['cache-control'], 'no-store');
    assert.doesNotMatch(x.body, /token|github_pat_/i);
  }
});

test('serves SVG with explicit CDN cache policy and ETag', async () => {
  const x = await invoke(handler());
  assert.equal(x.status, 200);
  assert.equal(x.body, SVG);
  assert.equal(x.headers['content-type'], 'image/svg+xml; charset=utf-8');
  assert.match(x.headers['cache-control'], /s-maxage=300/);
  assert.equal(x.headers['x-content-type-options'], 'nosniff');
  assert.match(x.headers.etag, /^"[0-9a-f]{64}"$/);
});

test('fresh cache returns HIT and conditional request returns 304', async () => {
  let calls = 0;
  const h = handler({ source: async () => { calls++; return {}; } });
  const first = await invoke(h);
  const second = await invoke(h, req());
  const third = await invoke(h, req(undefined, { 'if-none-match': first.headers.etag }));
  assert.equal(first.headers['x-deus-chart-cache'], 'MISS');
  assert.equal(second.headers['x-deus-chart-cache'], 'HIT');
  assert.equal(third.status, 304);
  assert.equal(third.body, '');
  assert.equal(calls, 1);
});

test('TTL expiry triggers refresh only on another HTTP request, without timers', async () => {
  let clock = 10000, calls = 0;
  const h = handler({
    now: () => clock, freshMs: 300000,
    source: async () => { calls++; return {}; }
  });
  await invoke(h);
  clock += 300001;
  const next = await invoke(h);
  assert.equal(next.status, 200);
  assert.equal(calls, 2);
});

test('concurrent same-key requests share a single upstream call', async () => {
  let calls = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const h = handler({ source: async () => { calls++; await barrier; return {}; } });
  const p1 = invoke(h), p2 = invoke(h);
  release();
  const a = await Promise.all([p1, p2]);
  assert.deepEqual(a.map(x => x.status), [200, 200]);
  assert.equal(calls, 1);
});

test('bounded concurrency rejects distinct overload without contacting GitHub', async () => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const h = handler({ maxInflight: 1, source: async () => { await barrier; return {}; } });
  const first = invoke(h);
  const second = await invoke(h, req('/api/chart?username=another'));
  release();
  await first;
  assert.equal(second.status, 503);
  assert.match(second.body, /LIVE_BUSY/);
});

test('missing server-only credential returns no-store 503 without calling source', async () => {
  let calls = 0;
  const h = handler({ getToken: () => '', source: async () => { calls++; } });
  const x = await invoke(h);
  assert.equal(x.status, 503);
  assert.match(x.body, /LIVE_NOT_CONFIGURED/);
  assert.equal(x.headers['cache-control'], 'no-store');
  assert.equal(calls, 0);
});

test('upstream failure is sanitized and never leaks secret material', async () => {
  const h = handler({ source: async () => { throw new Error('token github_pat_DO_NOT_LOG'); } });
  const x = await invoke(h);
  assert.equal(x.status, 502);
  assert.match(x.body, /LIVE_UPSTREAM_UNAVAILABLE/);
  assert.doesNotMatch(x.body, /github_pat_|DO_NOT_LOG|token/i);
});

test('stale validated image is retained briefly when upstream fails', async () => {
  let clock = 1000, calls = 0;
  const h = handler({
    now: () => clock, freshMs: 100, staleMs: 1000,
    source: async () => { if (++calls > 1) throw Error('temporary'); return {}; }
  });
  const first = await invoke(h);
  clock = 1101;
  const result = await invoke(h);
  assert.equal(result.status, 200);
  assert.equal(result.headers['x-deus-chart-cache'], 'STALE');
  assert.equal(result.body, first.body);
  clock = 2201;
  const expired = await invoke(h);
  assert.equal(expired.status, 502);
});

test('rejects unexpected methods, oversized or unsafe SVG, and invalid cache settings', async () => {
  assert.equal((await invoke(handler(), req(undefined, {}, 'POST'))).status, 405);
  for (const bad of ['<svg><script>bad</script></svg>', 'garbage',
    '<svg><foreignObject>bad</foreignObject></svg>', '<svg>NaN</svg>']) {
    assert.equal((await invoke(handler({ render: () => bad }))).status, 502);
  }
  assert.throws(() => handler({ staleMs: -1 }), /INVALID_CACHE_CONFIG/);
});

test('reuses unchanged production snapshot renderer in full 365-day mode', async () => {
  const now = '2026-10-14T12:00:00.000Z';
  const { startDate, endDate } = utcWindow(new Date(now));
  const counts = new Map();
  let cursor = new Date(startDate + 'T00:00:00.000Z');
  for (let i = 0; i < 365; i++) {
    counts.set(cursor.toISOString().slice(0, 10), i % 5);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const h = createLiveChartHandler({
    now: () => Date.parse(now),
    getToken: () => 'fixture',
    source: async () => ({
      sourceDetails: { type: 'github', username: 'example' },
      counts, startDate, endDate, asOf: now
    })
  });
  const response = await invoke(h);
  assert.equal(response.status, 200);
  assert.match(response.body, /^<svg /);
  assert.match(response.body, /365 days/);
  assert.match(response.body, /Snapshot /);
  assert.doesNotMatch(response.body, /<script\b/);
  // Existing renderer contract is kept; the live adapter does not alter it.
  assert.equal(typeof createAssetBundle, 'function');
});
