'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { utcWindow } = require('../contribution-snapshot');
const { createAssetBundle } = require('../build-activity-assets');

// A golden is SHA-256 of the COMPLETE rendered SVG, not a regex against labels.
// Fixed UTC clock/data/theme make accidental SVG geometry or content drift visible.
const CLOCK='2026-10-10T12:00:00.000Z';
const WINDOWS=[30,90,365];
function fixedCounts(variant) {
  const {startDate,endDate}=utcWindow(CLOCK);
  const counts=new Map();
  let offset=0;
  for(let ms=Date.parse(startDate+'T00:00:00Z');ms<=Date.parse(endDate+'T00:00:00Z');ms+=86400000) {
    let number;
    if(variant==='all-zero')number=0;
    else number=offset===364 ? 21 : offset===363 ? 3 : offset===300 ? 38 :
      offset===150 ? 80 : offset % 19===0 ? 5 : offset % 11===0 ? 1 : 0;
    counts.set(new Date(ms).toISOString().slice(0,10), number);
    offset++;
  }
  return {counts,startDate,endDate,asOf:CLOCK,
    sourceDetails:{type:'github',username:'fixture-user'}};
}
function cases() {
  return [
    {name:'spikes-spacious-dark',source:fixedCounts('spikes'),
      options:{layout:'spacious',theme:'github-compact',title:'Golden activity snapshot'}},
    {name:'zero-compact-light',source:fixedCounts('all-zero'),
      options:{layout:'compact',theme:'github-light',title:'Golden empty calendar'}}
  ];
}
function renders() {
  const output={};
  for(const scenario of cases()) {
    const {assets,manifest}=createAssetBundle(scenario.source,scenario.options);
    const hashes={}, totals={};
    for(const days of WINDOWS) {
      const name='activity-'+days+'d.svg';
      const svg=assets[name];
      hashes[days]=createHash('sha256').update(svg,'utf8').digest('hex');
      totals[days]=manifest.ranges[days].total;
      assert.match(svg,/^<svg /);
      assert.match(svg,/<g data-chart-series="daily-bars">/);
      assert.match(svg,/<path data-series="trend" d="/);
      assert.doesNotMatch(svg,/<script|<foreignObject|<image\b|NaN|Infinity|\b(?:href|src)=["'](?:https?:|\/\/|data:|javascript:)/i);
      assert.ok(svg.includes(days+' days · '+totals[days]+' contributions'));
      assert.ok(svg.includes('Snapshot '+manifest.snapshotId.slice(0,10)));
    }
    output[scenario.name]={snapshotId:manifest.snapshotId,totals,hashes};
  }
  return output;
}
if(process.argv.includes('--print-golden')) {
  // Deliberate review-time golden refresh. Never update fixtures during CI tests.
  process.stdout.write(JSON.stringify(renders(),null,2)+'\n');
} else {
  test('fixed 30/90/365 SVG golden outputs remain byte-stable in both themes and layouts',()=>{
    const expected=require('./svg-golden.json');
    const actual=renders();
    // This temporary capture mode is used once to record baseline from PR CI.
    // It will be removed before merge, with the reviewed hashes checked in.
    if(expected.capture===true) {
      console.log('SVG_GOLDEN_CANDIDATE '+JSON.stringify(actual));
      assert.equal(Object.keys(actual).length,2);
    } else {
      assert.deepEqual(actual,expected,
        'Golden SVG changed; review intended visual/data/metadata differences before updating fixtures');
    }
  });
}
