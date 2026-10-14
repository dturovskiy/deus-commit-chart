'use strict';

// First-party, dependency-free self-hosted HTTP entry point.
// Only loopback is exposed; the gateway handles public HTTPS, limits, and routing.
const http = require('node:http');
const { createLiveChartHandler } = require('./handler');

function parsePort(raw) {
  if (typeof raw !== 'string' || !/^[1-9][0-9]{0,4}$/.test(raw)) {
    throw new Error('INVALID_LIVE_PORT');
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > 65535) {
    throw new Error('INVALID_LIVE_PORT');
  }
  return value;
}

function createHttpServer({ handler = createLiveChartHandler() } = {}) {
  if (typeof handler !== 'function') throw new Error('INVALID_LIVE_HANDLER');
  const server = http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.url === '/healthz') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = req.method === 'GET' ? 200 : 405;
      return res.end(req.method === 'GET' ? 'ok\n' : 'METHOD_NOT_ALLOWED\n');
    }
    // Async failures must never disclose credential or upstream API text.
    Promise.resolve().then(() => handler(req, res)).catch(() => {
      if (res.headersSent) return res.destroy();
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end('{"error":"INTERNAL_ERROR"}');
    });
  });
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  server.maxRequestsPerSocket = 100;
  server.maxConnections = 128;
  return server;
}

function main() {
  if (!process.env.DEUS_CHART_LIVE_TOKEN) {
    throw new Error('LIVE_SERVER_CREDENTIAL_MISSING');
  }
  const port = parsePort(process.env.DEUS_CHART_PORT || '8787');
  const server = createHttpServer();
  server.on('error', () => {
    console.error('LIVE_SERVER_LISTEN_FAILED');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('DEUS_LIVE_LOOPBACK_READY port=' + port);
  });
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.message === 'LIVE_SERVER_CREDENTIAL_MISSING'
      ? 'LIVE_SERVER_CREDENTIAL_MISSING' : 'LIVE_SERVER_START_FAILED');
    process.exitCode = 1;
  }
}
module.exports = { createHttpServer, parsePort };
