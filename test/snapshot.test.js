'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { utcWindow, assertCalendar, mergeCalendarWeeks, fetchGithubDailyCounts, snapshotIdentity } =
  require('../contribution-snapshot');
const { buildSeries, selectRange } = require('../generate-commit-chart');
const { createAssetBundle, writeBundle, cliArgs } = require('../build-activity-assets');
const { verifyDirectory } = require('../verify-activity-assets');
const { smoothPath } = require('../modern-renderer');

const asOf = new Date('2026-10-10T12:35:17Z');
function calendarCounts(today = 3) {
  const window = utcWindow(asOf);
  const days = [];
  for (let ms = Date.parse(window.from); ms <= Date.parse(window.endDate + 'T00:00:00Z'); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    days.push({ date, contributionCount: date === '2026-10-09' ? 7 :
      date === '2026-10-10' ? today : 0 });
  }
  return { days, window };
}
function apiResponse(days, mainDays = days) {
  return { ok: true, status: 200, json: async () => ({
    data: { user: { edge: { contributionCalendar: {
      weeks: [{ contributionDays: days.slice(0, 20) }]
    } }, contributionsCollection: {
      totalCommitContributions: 25, restrictedContributionsCount: 0,
      hasAnyRestrictedContributions: false,
      contributionCalendar: {
        totalContributions: days.reduce((sum, d) => sum + d.contributionCount, 0),
        weeks: [{ contributionDays: mainDays }]
      }
    } } }
  }) };
}
const fetchFixture = (days, tally) => async (_url, opts) => {
  tally.calls++;
  assert.equal(opts.method, 'POST');
  const variables = JSON.parse(opts.body).variables;
  assert.equal(variables.login, 'dturovskiy');
  assert.equal(variables.from, '2025-10-10T00:00:00.000Z');
  assert.equal(variables.to, '2026-10-12T00:00:00.000Z');
  assert.equal(variables.edgeFrom, '2025-09-27T00:00:00.000Z');
  assert.equal(variables.edgeTo, '2025-10-25T00:00:00.000Z');
  return apiResponse(days);
};

test('GitHub snapshot uses one read and exact calendar coverage, including zero days', async () => {
  const { days } = calendarCounts(3);
  const tally = { calls: 0 };
  const source = await fetchGithubDailyCounts('dturovskiy', {
    asOf, token: 'test-token', fetchImpl: fetchFixture(days, tally), attempts: 1
  });
  assert.equal(tally.calls, 1);
  assert.equal(source.counts.size, 365);
  assert.equal(source.counts.get('2026-10-10'), 3);
  assert.equal(source.counts.get('2026-10-08'), 0);
  const output = createAssetBundle(source);
  assert.equal(output.manifest.ranges[30].total, 10);
  assert.equal(output.manifest.ranges[365].total, 10);
  assert.equal(Object.keys(output.manifest.assets).length, 4);
  assert.equal(output.manifest.generatedAt, asOf.toISOString());
  assert.match(output.assets['activity-30d.svg'], /Snapshot [a-f0-9]{10}/);
  assert.match(output.assets['activity-30d.svg'], /Updated 2026-10-10 12:35 UTC/);
  const htmlData = JSON.parse(output.assets['index.html'].match(
    /<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(htmlData.meta.snapshotId, output.manifest.snapshotId);
  assert.equal(htmlData.data.at(-1).commits, 3);
});

test('3-to-15 update raises the daily value and 30d total by exactly 12', async () => {
  const generate = async (count) => {
    const { days } = calendarCounts(count);
    const source = await fetchGithubDailyCounts('dturovskiy', {
      asOf, token: 'test', fetchImpl: async () => apiResponse(days), attempts: 1
    });
    return createAssetBundle(source);
  };
  const old = await generate(3), current = await generate(15);
  assert.equal(current.manifest.ranges[30].total - old.manifest.ranges[30].total, 12);
  assert.equal(current.manifest.ranges[365].total - old.manifest.ranges[365].total, 12);
  assert.notEqual(old.manifest.snapshotId, current.manifest.snapshotId);
  assert.equal(current.meta.totalCommits - old.meta.totalCommits, 12);
  assert.match(current.assets['activity-30d.svg'], /30 days · 22 contributions/);
});

test('incomplete or duplicated GitHub days are never converted to zero', () => {
  const { days, window } = calendarCounts();
  assert.equal(assertCalendar([{ contributionDays: days }], window.startDate, window.endDate).size, 365);
  assert.throws(() => assertCalendar([{ contributionDays: days.slice(1) }],
    window.startDate, window.endDate), /Incomplete GitHub calendar/);
  assert.throws(() => assertCalendar([{ contributionDays: [...days, days.at(-1)] }],
    window.startDate, window.endDate), /Duplicate/);
  const bad = days.map((d) => ({ ...d }));
  bad[3].contributionCount = -1;
  assert.throws(() => assertCalendar([{ contributionDays: bad }],
    window.startDate, window.endDate), /Invalid contribution count/);
});

test('401 is not retried and transient HTTP errors are bounded', async () => {
  const unauthorized = { ok: false, status: 401 };
  let calls = 0;
  await assert.rejects(() => fetchGithubDailyCounts('dturovskiy', {
    asOf, token: 'test', fetchImpl: async () => { calls++; return unauthorized; },
    attempts: 3, sleep: async () => {}
  }), /HTTP 401/);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(() => fetchGithubDailyCounts('dturovskiy', {
    asOf, token: 'test', fetchImpl: async () => { calls++; return { ok: false, status: 503 }; },
    attempts: 3, sleep: async () => {}
  }), /HTTP 503/);
  assert.equal(calls, 3);
});

test('build manifest detects tampering before publish', () => {
  const { days, window } = calendarCounts(15);
  const counts = assertCalendar([{ contributionDays: days }], window.startDate, window.endDate);
  const source = { counts, startDate: window.startDate, endDate: window.endDate,
    asOf: asOf.toISOString(), sourceDetails: { type: 'github', username: 'dturovskiy',
      totalCommitContributions: 20, restrictedContributionsCount: 0,
      hasAnyRestrictedContributions: false } };
  const { assets } = createAssetBundle(source);
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-verified-'));
  const folder = path.join(parent, 'published');
  try {
    writeBundle(folder, assets);
    const manifest = verifyDirectory(folder);
    assert.equal(manifest.ranges[30].total, 22);
    assert.throws(() => writeBundle(folder, assets), /Refusing to replace/);
    fs.appendFileSync(path.join(folder, 'activity-30d.svg'), '<!-- modified -->');
    assert.throws(() => verifyDirectory(folder), /checksum mismatch/);
  } finally { fs.rmSync(parent, { force: true, recursive: true }); }
});

test('fixed clock handles leap and year boundaries', () => {
  assert.equal(utcWindow('2024-03-01T00:10:00Z', 2).startDate, '2024-02-29');
  assert.equal(utcWindow('2026-01-01T00:00:00Z', 2).startDate, '2025-12-31');
  assert.equal(utcWindow('2026-10-10T23:59:59Z').endDate, '2026-10-10');
  assert.throws(() => utcWindow('not a date'), /Invalid build/);
});

test('CLI supports reusable Action choices and rejects invalid ranges', () => {
  const parsed = cliArgs(['node','build-activity-assets.js','--source','local',
    '--repo','.', '--ranges','90,365','--default-days','90','--show-border']);
  assert.deepEqual(parsed.ranges, [90,365]);
  assert.equal(parsed.hideBorder, false);
  assert.throws(() => cliArgs(['node','x','--ranges','10']), /Ranges/);
});

test('interpolation is monotone on segments and does not overshoot flat regions', () => {
  // Flat-to-rise and spike-to-flat curves must preserve endpoint y envelopes.
  const points = [{x:0,y:100},{x:10,y:100},{x:20,y:20},{x:30,y:20},{x:40,y:90}];
  const svg = smoothPath(points);
  assert.match(svg, /^M 0\.00 100\.00 C /);
  const nums = [...svg.matchAll(/ C ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+), ([\d.-]+) ([\d.-]+)/g)];
  assert.equal(nums.length, points.length - 1);
  nums.forEach((m, i) => {
    const [y1, y2] = [Number(m[2]),Number(m[4])];
    const lo=Math.min(points[i].y,points[i+1].y), hi=Math.max(points[i].y,points[i+1].y);
    assert.ok(y1 >= lo - .01 && y1 <= hi + .01 && y2 >= lo - .01 && y2 <= hi + .01);
  });
});
