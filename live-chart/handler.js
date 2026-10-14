'use strict';

// Experimental request-driven SVG endpoint. No timers, filesystem writes, or user tokens.
const { createHash } = require('node:crypto');
const { loadContributionSource } = require('../source-adapters');
const { createAssetBundle } = require('../build-activity-assets');

const FRESH_MS = 5 * 60 * 1000;
const STALE_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 64;
const MAX_INFLIGHT = 6;
const ALLOWED_KEYS = new Set(['username', 'days', 'theme']);
const VALID_USERNAME = /^(?!-)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const CACHE_CONTROL = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

function parseRequest(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length > 1024 || !rawUrl.startsWith('/')) {
    throw new Error('INVALID_REQUEST');
  }
  const parsed = new URL(rawUrl, 'https://deus.invalid');
  if (parsed.origin !== 'https://deus.invalid' ||
      !['/api/chart', '/api/chart.js'].includes(parsed.pathname)) {
    throw new Error('INVALID_PATH');
  }
  for (const [key] of parsed.searchParams) {
    if (!ALLOWED_KEYS.has(key) || parsed.searchParams.getAll(key).length !== 1) {
      throw new Error('INVALID_QUERY');
    }
  }
  const username = parsed.searchParams.get('username') || '';
  const days = parsed.searchParams.get('days') || '30';
  const theme = parsed.searchParams.get('theme') || 'github-compact';
  if (!VALID_USERNAME.test(username) || !['30', '90', '365'].includes(days) ||
      !['github-compact', 'github-light'].includes(theme)) {
    throw new Error('INVALID_PARAMS');
  }
  return { username: username.toLowerCase(), days: Number(days), theme };
}

function writeHeaders(res, entries) {
  for (const [key, value] of Object.entries(entries)) res.setHeader(key, value);
}

function sendError(res, status, code) {
  res.statusCode = status;
  writeHeaders(res, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify({ error: code }));
}

function sendSvg(req, res, entry, kind) {
  const fresh = kind !== 'STALE';
  res.statusCode = req.headers?.['if-none-match'] === entry.etag ? 304 : 200;
  writeHeaders(res, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': fresh ? CACHE_CONTROL : 'public, max-age=0, s-maxage=60',
    'X-Content-Type-Options': 'nosniff',
    'ETag': entry.etag,
    'X-Deus-Chart-Cache': kind
  });
  res.end(res.statusCode === 304 ? '' : entry.svg);
}

/**
 * Dependency injection keeps tests fully offline and never needs a real secret.
 * Memory cache is per serverless instance; CDN caching is separately controlled
 * with s-maxage. No promise of exact GitHub README/Camo freshness.
 */
function createLiveChartHandler(options = {}) {
  const source = options.source || loadContributionSource;
  const render = options.render || ((data, params) => {
    const out = createAssetBundle(data, {
      defaultDays: params.days, ranges: [params.days], theme: params.theme,
      title: 'GitHub contribution activity', layout: 'spacious', hideBorder: true
    });
    return out.assets['activity-' + params.days + 'd.svg'];
  });
  const getToken = options.getToken || (() => process.env.DEUS_CHART_LIVE_TOKEN || '');
  const now = options.now || Date.now;
  const freshMs = options.freshMs ?? FRESH_MS;
  const staleMs = options.staleMs ?? STALE_MS;
  const maxEntries = options.maxEntries ?? MAX_ENTRIES;
  const maxInflight = options.maxInflight ?? MAX_INFLIGHT;
  if (!Number.isInteger(freshMs) || freshMs < 1 ||
      !Number.isInteger(staleMs) || staleMs < freshMs ||
      !Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 1000 ||
      !Number.isInteger(maxInflight) || maxInflight < 1 || maxInflight > 100) {
    throw new Error('INVALID_CACHE_CONFIG');
  }

  const cache = new Map();
  const inflight = new Map();
  function remember(key, entry) {
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }
  async function refresh(key, params, token) {
    const data = await source(
      { source: 'github', username: params.username },
      { token, asOf: new Date(now()), attempts: 2, timeoutMs: 10000 }
    );
    const svg = render(data, params);
    if (typeof svg !== 'string' || !svg.startsWith('<svg ') ||
        Buffer.byteLength(svg, 'utf8') > 300000 ||
        /<script\b|<foreignObject\b|NaN|Infinity|href\s*=\s*["']https?:/i.test(svg)) {
      throw new Error('INVALID_SVG');
    }
    const entry = {
      svg, etag: '"' + createHash('sha256').update(svg).digest('hex') + '"',
      at: now()
    };
    remember(key, entry);
    return entry;
  }

  return async function liveChartHandler(req, res) {
    if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED');
    let params;
    try { params = parseRequest(req.url); } catch {
      return sendError(res, 400, 'INVALID_REQUEST');
    }
    const key = [params.username, params.days, params.theme].join(':');
    const existing = cache.get(key);
    if (existing && now() - existing.at < freshMs) {
      // Promote cache hit for bounded least-recently-used eviction.
      remember(key, existing);
      return sendSvg(req, res, existing, 'HIT');
    }

    const token = getToken();
    if (typeof token !== 'string' || token.length === 0) {
      return existing && now() - existing.at < staleMs
        ? sendSvg(req, res, existing, 'STALE')
        : sendError(res, 503, 'LIVE_NOT_CONFIGURED');
    }
    if (!inflight.has(key)) {
      if (inflight.size >= maxInflight) return sendError(res, 503, 'LIVE_BUSY');
      // One upstream request per canonical key in the same instance.
      let pending;
      pending = refresh(key, params, token).finally(() => {
        if (inflight.get(key) === pending) inflight.delete(key);
      });
      inflight.set(key, pending);
    }
    try {
      const entry = await inflight.get(key);
      return sendSvg(req, res, entry, 'MISS');
    } catch {
      // Never expose GitHub errors, private token material, or upstream bodies.
      if (existing && now() - existing.at < staleMs) {
        return sendSvg(req, res, existing, 'STALE');
      }
      return sendError(res, 502, 'LIVE_UPSTREAM_UNAVAILABLE');
    }
  };
}

module.exports = { createLiveChartHandler, parseRequest };
