'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../chart-series');
const legacyCli = require('../generate-commit-chart');
const renderer = require('../modern-renderer');

test('legacy public CLI exports remain identity-equal to the pure core', () => {
  assert.equal(legacyCli.buildSeries, core.buildSeries);
  assert.equal(legacyCli.createMeta, core.createMeta);
  assert.equal(legacyCli.selectRange, renderer.selectRange);
  assert.equal(typeof legacyCli.readGithubDailyCounts, 'function');
  assert.equal(typeof legacyCli.readLocalGitDailyCounts, 'function');
  assert.equal(typeof legacyCli.renderSvg, 'function');
  assert.equal(typeof legacyCli.renderHtml, 'function');
  assert.equal(legacyCli.svgDate('2026-10-11', true), 'Oct 11, 2026');
});

test('publisher and verifier depend on core/render modules instead of the CLI', () => {
  const root = path.join(__dirname, '..');
  const builder = fs.readFileSync(path.join(root, 'build-activity-assets.js'), 'utf8');
  const verifier = fs.readFileSync(path.join(root, 'verify-activity-assets.js'), 'utf8');
  const cli = fs.readFileSync(path.join(root, 'generate-commit-chart.js'), 'utf8');
  const chartCore = fs.readFileSync(path.join(root, 'chart-series.js'), 'utf8');
  for (const [name, code] of [['builder', builder], ['verifier', verifier], ['core', chartCore]]) {
    assert.doesNotMatch(code, /require\(['"]\.\/generate-commit-chart['"]\)/, name + ' must not import CLI entrypoint');
  }
  assert.match(builder, /require\(['"]\.\/chart-series['"]\)/);
  assert.match(verifier, /require\(['"]\.\/modern-renderer['"]\)/);
  assert.match(cli, /require\(['"]\.\/chart-series['"]\)/);
  assert.doesNotMatch(chartCore, /\bprocess\.argv\b|process\.exit\b|\bwriteFileSync\b|\bfetch\s*\(/);
});

test('core builds UTC daily statistics and public metadata without mutation', () => {
  const counts = new Map([['2026-10-09', 3], ['2026-10-11', 5]]);
  const series = core.buildSeries(counts, '2026-10-09', '2026-10-11');
  assert.deepEqual(series.map(p => p.commits), [3, 0, 5]);
  assert.deepEqual(series.map(p => p.cumulative), [3, 3, 8]);
  assert.deepEqual(series.map(p => p.ma7), [3, 1.5, 2.67]);
  const sourceData = {
    sourceDetails: {type: 'github', username: 'fixture'},
    asOf: '2026-10-11T12:00:00.000Z',
    startDate: '2026-10-09',
    endDate: '2026-10-11'
  };
  const meta = core.createMeta({days: 30}, sourceData, series);
  assert.equal(meta.totalCommits, 8);
  assert.equal(meta.activeDays, 2);
  assert.equal(meta.username, 'fixture');
  assert.equal(meta.repo, null);
  assert.equal(meta.generatedAt, sourceData.asOf);
  assert.equal(meta.defaultDays, 30);
  assert.match(meta.snapshotId, /^[0-9a-f]{64}$/);
  assert.equal(counts.size, 2, 'no in-place source count mutation');
});
