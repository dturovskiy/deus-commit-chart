'use strict';

// One trusted contribution-calendar read per build. No credentials enter its return value.
const { createHash } = require('node:crypto');
const DAY_MS = 86400000;
const GRAPHQL_QUERY = [
  'query CommitChart($login: String!, $from: DateTime!, $to: DateTime!, $edgeFrom: DateTime!, $edgeTo: DateTime!) {',
  '  user(login: $login) { contributionsCollection(from: $from, to: $to) {',
  '    contributionCalendar { weeks { contributionDays { date contributionCount } } }',
  '  }',
  '  edge: contributionsCollection(from: $edgeFrom, to: $edgeTo) {',
  '    contributionCalendar { weeks { contributionDays { date contributionCount } } }',
  '  }',
  '  }',
  '}'
].join('\n');

function parseIsoDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid ISO calendar day: ' + String(value));
  }
  const ms = Date.parse(value + 'T00:00:00.000Z');
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid ISO calendar day: ' + value);
  }
  return ms;
}

function utcWindow(asOf, days = 365) {
  const instant = new Date(asOf);
  if (!Number.isFinite(instant.getTime())) throw new Error('Invalid build asOf timestamp');
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('Invalid calendar window');
  const endDate = instant.toISOString().slice(0, 10);
  const startDate = new Date(parseIsoDay(endDate) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  return { startDate, endDate, from: startDate + 'T00:00:00.000Z',
    to: new Date(parseIsoDay(endDate) + DAY_MS).toISOString() };
}

function assertCalendar(weeks, startDate, endDate) {
  const start = parseIsoDay(startDate);
  const end = parseIsoDay(endDate);
  if (end < start) throw new Error('Reversed GitHub calendar window');
  if (!Array.isArray(weeks)) throw new Error('GitHub calendar weeks missing');
  const counts = new Map();
  for (const week of weeks) {
    if (!Array.isArray(week?.contributionDays)) throw new Error('Malformed GitHub calendar week');
    for (const day of week.contributionDays) {
      const ms = parseIsoDay(day?.date);
      if (ms < start || ms > end) continue; // GitHub may return surrounding week days.
      if (!Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) {
        throw new Error('Invalid contribution count for ' + day.date);
      }
      if (counts.has(day.date)) throw new Error('Duplicate GitHub calendar day: ' + day.date);
      counts.set(day.date, day.contributionCount);
    }
  }
  const length = Math.floor((end - start) / DAY_MS) + 1;
  if (counts.size !== length) {
    const missing = [];
    for (let ms = start; ms <= end; ms += DAY_MS) {
      const date = new Date(ms).toISOString().slice(0, 10);
      if (!counts.has(date)) missing.push(date);
    }
    const receivedDays = Array.from(counts.keys()).sort();
    throw new Error('Incomplete GitHub calendar: missing ' + missing.slice(0, 8).join(', ') +
      (missing.length > 8 ? ' ...' : '') + '; received ' + counts.size +
      ' days in requested window (' + (receivedDays[0] || 'none') + ' .. ' +
      (receivedDays.at(-1) || 'none') + '), expected ' + length +
      ' (' + startDate + ' .. ' + endDate + ')');
  }
  return new Map([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

function mergeCalendarWeeks(primary, boundary) {
  if (!Array.isArray(primary) || !Array.isArray(boundary)) {
    throw new Error('Missing GitHub calendar segment');
  }
  const merged = new Map();
  for (const weeks of [primary, boundary]) {
    for (const week of weeks) {
      if (!Array.isArray(week?.contributionDays)) throw new Error('Malformed GitHub calendar segment');
      for (const day of week.contributionDays) {
        parseIsoDay(day?.date);
        if (!Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0) {
          throw new Error('Invalid GitHub segment contribution count: ' + day.date);
        }
        if (merged.has(day.date) && merged.get(day.date) !== day.contributionCount) {
          throw new Error('Inconsistent overlapping GitHub calendar day: ' + day.date);
        }
        merged.set(day.date, day.contributionCount);
      }
    }
  }
  return [{ contributionDays: Array.from(merged, ([date, contributionCount]) => ({ date, contributionCount })) }];
}

const HTTP_CODES = Object.freeze({
  401: 'authentication',
  403: 'authorization',
  429: 'rate_limited'
});

function githubHttpCategory(status) {
  return HTTP_CODES[status] || (status >= 500 ? 'server_error' : 'http_client_error');
}

class GitHubSourceError extends Error {
  constructor(category, message, status = null, attempts = 1) {
    super(message);
    this.name = 'GitHubSourceError';
    this.code = category;
    this.status = status;
    this.attempts = attempts;
  }
}

async function fetchGithubDailyCounts(username, options = {}) {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(username || '')) throw new Error('Invalid GitHub username');
  const token = options.token ?? (process.env.DEUS_COMMIT_CHART_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN);
  if (!token) throw new Error('GitHub source requires a token in the environment');
  const asOf = new Date(options.asOf ?? new Date());
  const window = utcWindow(asOf);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? 15000;
  const attempts = options.attempts ?? 3;
  if (!(timeoutMs > 0 && Number.isFinite(timeoutMs)) || !(Number.isInteger(attempts) && attempts >= 1 && attempts <= 5)) {
    throw new Error('Invalid request timeout/retry configuration');
  }
  let payload;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let status = null;
    try {
      const response = await fetchImpl('https://api.github.com/graphql', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json',
          'User-Agent': 'deus-commit-chart' },
        body: JSON.stringify({ query: GRAPHQL_QUERY,
          // GitHub contribution calendar uses account-local calendar-day boundaries;
          // request one extra day on each side, then validate and trim exact UTC dates.
          variables: { login: username,
            from: new Date(parseIsoDay(window.startDate) - DAY_MS).toISOString(),
            to: new Date(parseIsoDay(window.endDate) + 2 * DAY_MS).toISOString(),
            // An independent short collection captures the first partial calendar week
            // that GitHub can omit from a year-long contributionCalendar.
            edgeFrom: new Date(parseIsoDay(window.startDate) - 14 * DAY_MS).toISOString(),
            edgeTo: new Date(parseIsoDay(window.startDate) + 14 * DAY_MS).toISOString() } })
      });
      status = response.status;
      if (!response.ok) throw new Error('GitHub GraphQL HTTP ' + response.status);
      payload = await response.json();
      if (payload?.errors?.length) throw new Error('GitHub GraphQL returned errors');
      break;
    } catch (error) {
      const category = controller.signal.aborted ? 'timeout'
        : status !== null && status >= 400 ? githubHttpCategory(status)
        : error instanceof SyntaxError ? 'malformed_json'
        : /GraphQL returned errors/.test(error.message) ? 'graphql_error'
        : 'network_error';
      const retryable = ['timeout', 'rate_limited', 'server_error', 'network_error'].includes(category);
      if (!retryable || attempt === attempts - 1) {
        throw new GitHubSourceError(category,
          'Failed to retrieve GitHub contributions: ' +
          (controller.signal.aborted ? 'request timed out' : error.message),
          status, attempt + 1);
      }
      await sleep(Math.min(2000, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }
  const collection = payload?.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!calendar) throw new Error('GitHub contribution calendar unavailable');
  const edgeCalendar = payload?.data?.user?.edge?.contributionCalendar;
  if (!edgeCalendar) throw new Error('Missing GitHub boundary calendar');
  const counts = assertCalendar(
    mergeCalendarWeeks(calendar.weeks, edgeCalendar.weeks), window.startDate, window.endDate);
  // Only public chart identity is retained. Daily aggregates are the chart's
  // intentional published signal; do not request or persist restricted/private
  // contribution breakdowns, even if the caller token could read them.
  return {
    counts, startDate: window.startDate, endDate: window.endDate, asOf: asOf.toISOString(),
    sourceDetails: { type: 'github', username }
  };
}

function snapshotIdentity(sourceData, series) {
  const encoded = JSON.stringify({
    version: 1, source: sourceData.sourceDetails.type,
    username: sourceData.sourceDetails.username || null,
    startDate: sourceData.startDate, endDate: sourceData.endDate,
    days: series.map((p) => [p.date, p.commits])
  });
  return createHash('sha256').update(encoded).digest('hex');
}

module.exports = { parseIsoDay, utcWindow, assertCalendar, mergeCalendarWeeks, fetchGithubDailyCounts, snapshotIdentity, GitHubSourceError, githubHttpCategory };
