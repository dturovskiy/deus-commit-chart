'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { trailingMean7, dailyTotals }=require('../activity-metrics');
const {buildSeries}=require('../generate-commit-chart');
const {chartGeometry,buildTicks,resolveLayout,selectRange}=require('../modern-renderer');
const {utcWindow}=require('../contribution-snapshot');

test('pure trailing 7-day averages round correctly on one, two and seven samples',()=>{
  assert.equal(trailingMean7([3]),3);
  assert.equal(trailingMean7([3,15]),9);
  assert.equal(trailingMean7([0,0,0,0,0,0,1]),0.14);
  assert.equal(trailingMean7([7,7,7,7,7,7,7]),7);
  for(const values of [[],Array(8).fill(1),[0,-1],[1,NaN],[Number.MAX_SAFE_INTEGER,1]]) {
    assert.throws(()=>trailingMean7(values));
  }
});

test('pure daily totals distinguish zeros from active days and reject invalid counts',()=>{
  assert.deepEqual(dailyTotals([{commits:0},{commits:3},{commits:15}]),{total:18,activeDays:2});
  assert.deepEqual(dailyTotals([]),{total:0,activeDays:0});
  assert.throws(()=>dailyTotals([{commits:-1}]));
  assert.throws(()=>dailyTotals([{commits:1.1}]));
  assert.throws(()=>dailyTotals([{commits:NaN}]));
});

test('365-day series and short windows use the same pure daily metrics',()=>{
  const asOf='2026-10-10T10:20:00.000Z';
  const window=utcWindow(asOf);
  const counts=new Map([[window.startDate,7],['2026-10-09',3],[window.endDate,15]]);
  const series=buildSeries(counts,window.startDate,window.endDate);
  assert.equal(series.length,365);
  assert.equal(series.at(-1).ma7,Number((18/7).toFixed(2)));
  assert.equal(series.at(-1).cumulative,25);
  for(const range of [30,90,365]) {
    const data=selectRange(series,range);
    assert.equal(data.length,range);
    const totals=dailyTotals(data);
    assert.equal(totals.total,range===365?25:18);
    assert.equal(totals.activeDays,range===365?3:2);
    const g=chartGeometry(series,range,resolveLayout({layout:'spacious'}));
    assert.equal(g.data.length,range);
    assert.equal(g.bars.length,range);
    const ticks=buildTicks(g.data,g.x,range,resolveLayout({layout:'spacious'}));
    assert.ok(ticks.length>=2 && ticks.length<=7);
    assert.ok(ticks[0].x<ticks.at(-1).x);
  }
});
