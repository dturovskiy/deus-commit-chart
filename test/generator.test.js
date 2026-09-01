'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSeries,
  selectRange,
  renderSvg,
  svgDate
} = require('../generate-commit-chart');

test('buildSeries preserves zero-activity calendar days and calculates cumulative values', () => {
  const counts = new Map([
    ['2026-01-01', 1],
    ['2026-01-03', 2]
  ]);

  const series = buildSeries(counts, '2026-01-01', '2026-01-03');

  assert.equal(series.length, 3);
  assert.deepEqual(series.map((point) => point.commits), [1, 0, 2]);
  assert.deepEqual(series.map((point) => point.cumulative), [1, 1, 3]);
  assert.equal(series[2].ma7, 1);
});

test('selectRange returns an exact trailing window and resets cumulative activity inside it', () => {
  const counts = new Map();
  for (let day = 1; day <= 31; day++) {
    counts.set(`2026-01-${String(day).padStart(2, '0')}`, 1);
  }
  const series = buildSeries(counts, '2026-01-01', '2026-01-31');
  const selected = selectRange(series, 30);

  assert.equal(selected.length, 30);
  assert.equal(selected[0].date, '2026-01-02');
  assert.equal(selected.at(-1).date, '2026-01-31');
  assert.equal(selected[0].cumulative, 1);
  assert.equal(selected.at(-1).cumulative, 30);
});

test('renderSvg produces static README-safe SVG without scripts', () => {
  const counts = new Map([
    ['2026-01-01', 1],
    ['2026-01-02', 3],
    ['2026-01-03', 0]
  ]);
  const series = buildSeries(counts, '2026-01-01', '2026-01-03');
  const svg = renderSvg(
    'Activity',
    '',
    { source: 'local', repo: 'fixture', branch: 'main' },
    series,
    30,
    { theme: 'github-compact', layout: 'comfortable', hideBorder: false }
  );

  assert.match(svg, /^<svg /);
  assert.match(svg, /<title id="chart-title">Activity<\/title>/);
  assert.match(svg, /fixture · main/);
  assert.doesNotMatch(svg, /<script/i);
  assert.match(svg, /viewBox="0 0 1000 350"/);
  assert.match(svg, / C /);
  assert.match(svg, /stroke-dasharray="5 7"/);
  assert.match(svg, />7d trend<\/text>/);
});

test('svgDate formats UTC dates deterministically', () => {
  assert.equal(svgDate('2026-09-01', false), 'Sep 01');
  assert.equal(svgDate('2026-09-01', true), 'Sep 01, 2026');
});
