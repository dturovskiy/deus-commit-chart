'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { fetchGithubDailyCounts, utcWindow } = require('../contribution-snapshot');
const { createAssetBundle, writeBundle } = require('../build-activity-assets');
const { verifyDirectory } = require('../verify-activity-assets');
const { buildSeries, createMeta } = require('../generate-commit-chart');

const asOf = '2026-10-10T20:00:00.000Z';
const forbidden = ['restrictedContributionsCount', 'hasAnyRestrictedContributions',
  'totalCommitContributions', 'totalContributions', 'SENSITIVE_SENTINEL_REPO'];

function sourceFixture(type = 'github') {
  const range = utcWindow(asOf);
  const counts = new Map();
  for (let time = Date.parse(range.from); time <= Date.parse(range.endDate + 'T00:00:00Z'); time += 86400000) {
    counts.set(new Date(time).toISOString().slice(0, 10), 1);
  }
  return {
    counts, startDate: range.startDate, endDate: range.endDate, asOf,
    sourceDetails: {
      type,
      username: 'dturovskiy',
      repo: 'SENSITIVE_SENTINEL_REPO', branch: 'branch-only-local', author: 'local-author',
      restrictedContributionsCount: 123456789,
      hasAnyRestrictedContributions: true,
      totalCommitContributions: 999,
      totalContributions: 1111,
      token: 'SHOULD_NEVER_LEAK'
    }
  };
}

test('GitHub GraphQL does not request private aggregate breakdowns and retains exact daily counts', async () => {
  const source = sourceFixture();
  let calls = 0;
  const dates = [...source.counts].map(([date, contributionCount]) => ({ date, contributionCount }));
  const result = await fetchGithubDailyCounts('dturovskiy', {
    token: 'TEST_ONLY', asOf, attempts: 1,
    fetchImpl: async (_url, options) => {
      calls++;
      const query = JSON.parse(options.body).query;
      assert.doesNotMatch(query, /restrictedContributionsCount|hasAnyRestrictedContributions|totalCommitContributions|totalContributions/);
      return { status: 200, ok: true, json: async () => ({
        data: { user: {
          contributionsCollection: { contributionCalendar: { weeks: [{ contributionDays: dates }] } },
          edge: { contributionCalendar: { weeks: [{ contributionDays: dates.slice(0, 16) }] } }
        } }
      }) };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.counts.size, 365);
  assert.equal(result.counts.get('2026-10-10'), 1);
  assert.deepEqual(result.sourceDetails, { type: 'github', username: 'dturovskiy' });
});

test('GitHub HTML, SVG and manifest publish daily counts without private source details', () => {
  const source = sourceFixture();
  const { assets, manifest } = createAssetBundle(source);
  assert.equal(manifest.publicDataPolicy, 'daily-aggregates-only-v1');
  assert.equal(manifest.ranges[365].total, 365);
  assert.equal(manifest.ranges[30].total, 30);
  const html = assets['index.html'];
  const parsed = JSON.parse(html.match(/<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(parsed.data.at(-1).commits, 1);
  assert.equal(parsed.meta.totalCommits, 365);
  assert.equal(parsed.meta.source, 'github');
  assert.equal(parsed.meta.username, 'dturovskiy');
  assert.equal(parsed.meta.repo, null);
  assert.equal(parsed.meta.branch, null);
  assert.equal(parsed.meta.author, null);
  for (const phrase of forbidden.concat('SHOULD_NEVER_LEAK')) {
    for (const [name, text] of Object.entries(assets)) {
      assert.ok(!text.includes(phrase), name + ' leaked sensitive source data ' + phrase);
    }
  }
  assert.match(html, /no private contribution breakdown is published/);
  assert.match(assets['activity-30d.svg'], /30 days · 30 contributions/);
});

test('local-mode repo and branch labels remain available for explicitly selected local charts', () => {
  const source = sourceFixture('local');
  const data = buildSeries(source.counts, source.startDate, source.endDate);
  const meta = createMeta({days:30}, source, data);
  assert.equal(meta.source, 'local');
  assert.equal(meta.repo, 'SENSITIVE_SENTINEL_REPO');
  assert.equal(meta.branch, 'branch-only-local');
  assert.equal(meta.author, 'local-author');
  assert.equal(meta.username, null);
  for (const key of forbidden.slice(0, 4)) assert.ok(!Object.hasOwn(meta, key), key);
});

test('post-checksum injected private metadata is rejected by independent publication verifier', () => {
  const { assets } = createAssetBundle(sourceFixture());
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-private-'));
  const dir = path.join(parent, 'dist');
  try {
    writeBundle(dir, assets);
    assert.equal(verifyDirectory(dir).publicDataPolicy, 'daily-aggregates-only-v1');
    const index = path.join(dir, 'index.html');
    const html = fs.readFileSync(index, 'utf8');
    const injected = html.replace('"source":"github"', '"restrictedContributionsCount":17,"source":"github"');
    assert.notEqual(injected, html);
    fs.writeFileSync(index, injected);
    const manifestPath = path.join(dir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.assets['index.html'].sha256 = createHash('sha256').update(injected).digest('hex');
    manifest.assets['index.html'].bytes = Buffer.byteLength(injected);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => verifyDirectory(dir), /Unexpected public chart payload metadata/);
  } finally { fs.rmSync(parent, { recursive:true, force:true }); }
});
