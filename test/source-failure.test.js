'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchGithubDailyCounts, utcWindow } = require('../contribution-snapshot');

const asOf = '2026-10-10T20:00:00Z';
const token = 'test-placeholder';
const opts = { token, asOf, attempts: 3, sleep: async () => {} };

test('403 permission failures are permanent, while 429 and 503 are retried with a ceiling', async () => {
  for (const status of [403, 429, 503]) {
    let calls = 0;
    await assert.rejects(
      fetchGithubDailyCounts('dturovskiy', {
        ...opts,
        fetchImpl: async () => { calls++; return { ok: false, status }; }
      }),
      new RegExp('HTTP ' + status)
    );
    assert.equal(calls, status === 403 ? 1 : 3);
  }
});

test('network failures retry up to the configured ceiling; malformed JSON does not', async () => {
  let networkCalls = 0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy', {
    ...opts, attempts: 2, fetchImpl: async () => {
      networkCalls++;
      throw new Error('socket closed');
    }
  }), /socket closed/);
  assert.equal(networkCalls, 2);

  let jsonCalls = 0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy', {
    ...opts,
    fetchImpl: async () => {
      jsonCalls++;
      return { ok: true, status: 200, json: async () => { throw new SyntaxError('unexpected JSON'); } };
    }
  }), /unexpected JSON/);
  assert.equal(jsonCalls, 1);
});

test('GraphQL semantic errors are not retried', async () => {
  let calls = 0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy', {
    ...opts, fetchImpl: async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ errors: [{ message: 'forbidden' }] }) };
    }
  }), /GraphQL returned errors/);
  assert.equal(calls, 1);
});

test('request timeout aborts attempts and fails with a bounded clear error', async () => {
  let calls = 0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy', {
    ...opts, attempts: 2, timeoutMs: 8,
    fetchImpl: async (_url, options) => {
      calls++;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }
  }), /request timed out/);
  assert.equal(calls, 2);
});

test('missing primary and boundary calendar dates reject the whole snapshot', async () => {
  const window = utcWindow(asOf);
  let date = Date.parse(window.from);
  const end = Date.parse(window.endDate + 'T00:00:00Z');
  const days = [];
  for (; date <= end; date += 86400000) {
    days.push({ date: new Date(date).toISOString().slice(0, 10), contributionCount: 1 });
  }
  const result = {
    data: { user: {
      contributionsCollection: {
        totalCommitContributions: 20,
        restrictedContributionsCount: 0,
        hasAnyRestrictedContributions: false,
        contributionCalendar: { totalContributions: 364,
          weeks: [{ contributionDays: days.slice(1) }] }
      },
      edge: { contributionCalendar: { weeks: [{ contributionDays: days.slice(1, 14) }] } }
    } }
  };
  await assert.rejects(fetchGithubDailyCounts('dturovskiy', {
    ...opts, attempts: 1,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => result })
  }), /Incomplete GitHub calendar: missing/);
});
