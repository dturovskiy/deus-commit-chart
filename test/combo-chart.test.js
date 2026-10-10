'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSeries } = require('../generate-commit-chart');
const { chartGeometry, dailyBarRects, renderModernSvg, resolveLayout } = require('../modern-renderer');

function fixture() {
  const counts = new Map();
  const start = Date.parse('2025-10-11T00:00:00.000Z');
  for (let index = 0; index < 365; index++) {
    const date = new Date(start + index * 86400000).toISOString().slice(0, 10);
    counts.set(date, index % 13 === 0 && index !== 364 ? 0 : (index % 17) + 1);
  }
  return buildSeries(counts, '2025-10-11', '2026-10-10');
}
const meta = {
  source: 'github', username: 'dturovskiy',
  currentDayPartial: true,
  generatedAt: '2026-10-10T20:21:46.111Z',
  snapshotId: 'e'.repeat(64)
};

test('30/90/365 static charts render exact positive daily bars plus one blue trend', () => {
  const series = fixture();
  for (const days of [30, 90, 365]) {
    const svg = renderModernSvg('Activity', '', meta, series, days,
      { theme: 'github-compact', layout: 'spacious', hideBorder: true });
    const expected = series.slice(-days).filter(day => day.commits > 0).length;
    const bars = [...svg.matchAll(/<rect data-series="daily" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"/g)];
    assert.equal(bars.length, expected, days + 'd has one bar per active day');
    assert.equal((svg.match(/<path data-series="trend"/g) || []).length, 1);
    assert.equal((svg.match(/<path data-series="daily"/g) || []).length, 0);
    assert.doesNotMatch(svg, /daily-area|areaPath|point-glow/);
    assert.match(svg, /data-chart-series="daily-bars"/);
    assert.match(svg, /7d trend/);
    const geometry = chartGeometry(series, days, resolveLayout({ layout: 'spacious' }));
    for (const bar of geometry.bars) {
      assert.ok(bar.x >= 70 - 0.01);
      assert.ok(bar.x + bar.width <= 1078 + 0.01);
      assert.ok(bar.height >= 0 && bar.width > 0);
    }
    const last = geometry.bars.at(-1);
    assert.ok(last.x + last.width <= 1078.01);
    assert.ok(geometry.bars[0].x >= 69.99);
    // Bars must be readable at 30d and thin enough for 365d.
    assert.ok(geometry.bars[0].width <= (days === 30 ? 24 : days === 90 ? 9 : 2.1));
  }
});

test('discrete days preserve genuine zero heights and positive extrema', () => {
  const series = fixture();
  const geometry = chartGeometry(series, 365, resolveLayout({ layout: 'spacious' }));
  assert.equal(geometry.bars.length, 365);
  assert.equal(geometry.bars[0].height, 0);
  assert.ok(geometry.bars[1].height > 0);
  assert.ok(geometry.bars[364].height > 0);
  const independentlyComputed = dailyBarRects(geometry.dailyPoints, geometry.baseline, geometry.plotW);
  assert.deepEqual(geometry.bars, independentlyComputed);
});

test('partial current day is visually distinct without changing its contribution count', () => {
  const series = fixture();
  const svg = renderModernSvg('Activity', '', meta, series, 30, { layout: 'spacious' });
  const matches = [...svg.matchAll(/<rect data-series="daily"[^>]*fill="([^"]+)" opacity="([^"]+)"/g)];
  assert.ok(matches.length > 0);
  assert.equal(matches.at(-1)[1], '#56d364');
  assert.equal(matches.at(-1)[2], '1');
  assert.match(svg, /Snapshot eeeeeeeeee/);
});
