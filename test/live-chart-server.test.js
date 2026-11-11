'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHttpServer, parsePort } = require('../live-chart/server');
const { createLiveChartHandler } = require('../live-chart/handler');

async function withServer(handler, run) {
  const server = createHttpServer({ handler });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    assert.equal(server.address().address, '127.0.0.1');
    return await run('http://127.0.0.1:' + server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('strict port validation cannot accidentally bind a privileged or wildcard endpoint', () => {
  assert.equal(parsePort('8787'), 8787);
  assert.equal(parsePort('65535'), 65535);
  for (const bad of ['0', '65536', '08a', '-1', '1.5', ' 8787', '', '999999']) {
    assert.throws(() => parsePort(bad), /INVALID_LIVE_PORT/);
  }
  assert.throws(() => createHttpServer({handler: 123}), /INVALID_LIVE_HANDLER/);
});

test('self-hosted HTTP health endpoint works without exposing configuration', async () => {
  const mock = async (_req, res) => res.end('NOT_REACHED');
  await withServer(mock, async base => {
    const good = await fetch(base + '/healthz');
    assert.equal(good.status, 200);
    assert.equal(await good.text(), 'ok\n');
    assert.equal(good.headers.get('cache-control'), 'no-store');
    const rejected = await fetch(base + '/healthz', { method: 'POST' });
    assert.equal(rejected.status, 405);
    assert.equal(rejected.headers.get('cache-control'), 'no-store');
  });
});

test('real loopback HTTP transport uses existing SVG handler and cache', async () => {
  let calls = 0;
  const handler = createLiveChartHandler({
    getToken: () => 'fixture-only',
    source: async () => { calls++; return {}; },
    render: () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  });
  await withServer(handler, async base => {
    const first = await fetch(base + '/api/chart?username=example&days=90');
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type'), /^image\/svg\+xml/);
    assert.match(await first.text(), /^<svg/);
    assert.equal(first.headers.get('x-deus-chart-cache'), 'MISS');
    const etag = first.headers.get('etag');
    const second = await fetch(base + '/api/chart?username=example&days=90',
      { headers: { 'if-none-match': etag } });
    assert.equal(second.status, 304);
    assert.equal(await second.text(), '');
    const bad = await fetch(base + '/api/chart?username=example&days=7');
    assert.equal(bad.status, 400);
    assert.equal(calls, 1);
  });
});

test('self-hosted wrapper sanitizes unexpected handler exceptions', async () => {
  await withServer(async () => { throw Error('DO_NOT_LEAK_SECRET'); }, async base => {
    const response = await fetch(base + '/api/chart?username=example');
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    assert.match(body, /INTERNAL_ERROR/);
    assert.doesNotMatch(body, /DO_NOT_LEAK_SECRET/);
  });
});
