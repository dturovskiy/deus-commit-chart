'use strict';

// One trusted contribution-calendar read per build. No credentials enter its return value.
const { createHash } = require('node:crypto');
const DAY_MS = 86400000;
const GRAPHQL_QUERY = [
  'query CommitChart($login: String!, $from: DateTime!, $to: DateTime!) {',
  '  user(login: $login) { contributionsCollection(from: $from, to: $to) {',
  '    totalCommitContributions restrictedContributionsCount hasAnyRestrictedContributions',
  '    contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }',
  '  } }',
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
    throw new Error('Incomplete GitHub calendar: missing ' + missing.slice(0, 8).join(', ') +
      (missing.length > 8 ? ' ...' : ''));
  }
  return new Map([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

function nonNegativeAggregate(value, key) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid GitHub aggregate: ' + key);
  }
  return value;
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
    let shouldRetry = true;
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
            to: new Date(parseIsoDay(window.endDate) + 2 * DAY_MS).toISOString() } })
      });
      shouldRetry = response.status === 429 || response.status >= 500;
      if (!response.ok) throw new Error('GitHub GraphQL HTTP ' + response.status);
      payload = await response.json();
      if (payload?.errors?.length) throw new Error('GitHub GraphQL returned errors');
      break;
    } catch (error) {
      // Authentication, malformed responses, and GraphQL errors are not transient.
      if (error instanceof SyntaxError || /GraphQL returned errors/.test(error.message)) shouldRetry = false;
      if (!shouldRetry || attempt === attempts - 1) {
        throw new Error('Failed to retrieve GitHub contributions: ' +
          (controller.signal.aborted ? 'request timed out' : error.message));
      }
      await sleep(Math.min(2000, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timeout);
    }
  }
  const collection = payload?.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!calendar) throw new Error('GitHub contribution calendar unavailable');
  const counts = assertCalendar(calendar.weeks, window.startDate, window.endDate);
  // Metadata is aggregated; NEVER include token or private repository identifiers.
  return {
    counts, startDate: window.startDate, endDate: window.endDate, asOf: asOf.toISOString(),
    sourceDetails: {
      type: 'github', username,
      totalContributions: nonNegativeAggregate(calendar.totalContributions, 'totalContributions'),
      totalCommitContributions: nonNegativeAggregate(collection.totalCommitContributions, 'totalCommitContributions'),
      restrictedContributionsCount: nonNegativeAggregate(collection.restrictedContributionsCount, 'restrictedContributionsCount'),
      hasAnyRestrictedContributions: Boolean(collection.hasAnyRestrictedContributions)
    }
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

module.exports = { parseIsoDay, utcWindow, assertCalendar, fetchGithubDailyCounts, snapshotIdentity };
