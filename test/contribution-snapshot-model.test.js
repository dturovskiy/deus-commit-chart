'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { utcWindow } = require('../contribution-snapshot');
const { createContributionSnapshot, validateContributionSnapshot,
  snapshotToSourceData } = require('../contribution-snapshot-model');
const { createAssetBundle } = require('../build-activity-assets');
const { buildSeries } = require('../generate-commit-chart');

const CLOCK = '2026-10-10T14:03:01.000Z';
const { startDate, endDate } = utcWindow(CLOCK);
const start = Date.parse(startDate + 'T00:00:00Z');

function input(source = 'github', fill = true) {
  const counts = new Map();
  for (let i = 0; i < 365; i++) {
    if (fill || i % 13 === 0) {
      const date = new Date(start + i * 86400000).toISOString().slice(0,10);
      counts.set(date, i === 364 ? 15 : i === 363 ? 3 : 0);
    }
  }
  return { counts, asOf:CLOCK, startDate, endDate,
    sourceDetails: source === 'github'
      ? {type:'github',username:'fixture-user',restrictedContributionsCount:777,token:'synthetic-only'}
      : {type:'local',repo:'fixture',branch:'main',author:null} };
}

test('canonical snapshot is deep-frozen, versioned, complete and privacy-minimized', () => {
  const raw = input();
  const snap = createContributionSnapshot(raw);
  assert.equal(snap.schemaVersion,1);
  assert.equal(snap.asOf,CLOCK);
  assert.match(snap.snapshotId,/^[a-f0-9]{64}$/);
  assert.deepEqual(snap.calendar,{startDate,endDate,days:365});
  assert.deepEqual(snap.quality,{
    complete:true,expectedDays:365,observedDays:365,missingDays:0,
    currentDayPartial:true,localZeroDaysInferred:false
  });
  assert.equal(snap.days.length,365);
  assert.equal(snap.days[364].contributions,15);
  assert.deepEqual(snap.source,{type:'github',username:'fixture-user'});
  assert.ok(Object.isFrozen(snap) && Object.isFrozen(snap.calendar) &&
    Object.isFrozen(snap.quality) && Object.isFrozen(snap.days) &&
    Object.isFrozen(snap.days[0]) && Object.isFrozen(snap.source));
  assert.throws(()=>{snap.days[0].contributions=70},TypeError);
  assert.doesNotMatch(JSON.stringify(snap),/restrictedContributionsCount|synthetic-only/);
  assert.deepEqual(validateContributionSnapshot(snap),snap);
  assert.equal(createAssetBundle(raw).manifest.snapshotId,snap.snapshotId);
});

test('local source explicitly infers zero-count days without modifying input Map', () => {
  const raw = input('local',false), originalSize=raw.counts.size;
  const snap = createContributionSnapshot(raw);
  assert.equal(raw.counts.size,originalSize);
  assert.equal(snap.days.length,365);
  assert.equal(snap.days[1].contributions,0);
  assert.equal(snap.quality.localZeroDaysInferred,true);
  assert.deepEqual(snap.source,{type:'local',repo:'fixture',branch:'main',author:null});
  const out = createAssetBundle(raw);
  assert.equal(out.manifest.snapshotId,snap.snapshotId);
  assert.equal(out.manifest.source,'local');
  const restored=snapshotToSourceData(snap);
  assert.equal(buildSeries(restored.counts,startDate,endDate).length,365);
});

test('invalid source, Gregorian day, range, count, completeness and clock fail closed', () => {
  for (const mutate of [
    raw=>raw.counts.set(endDate,-1),
    raw=>raw.counts.set(endDate,Number.MAX_SAFE_INTEGER+1),
    raw=>raw.counts.delete(endDate),
    raw=>raw.counts.set('2025-01-01',1),
    raw=>{raw.startDate='2026-13-01'},
    raw=>{raw.endDate='2026-10-09'},
    raw=>{raw.asOf='2026-10-09T14:03:01.000Z'},
    raw=>{raw.sourceDetails.type='private'},
    raw=>{raw.sourceDetails.username=''}
  ]) {
    const raw=input(); mutate(raw);
    assert.throws(()=>createContributionSnapshot(raw));
  }
});

test('tampering any snapshot data, quality, source or identity is detected', () => {
  const snapshot = createContributionSnapshot(input());
  const clone=()=>JSON.parse(JSON.stringify(snapshot));
  for (const tamper of [
    snap=>{snap.snapshotId='f'.repeat(64)},
    snap=>{snap.days[364].contributions=55},
    snap=>{snap.days[0].date=snap.days[1].date},
    snap=>{snap.quality.missingDays=1},
    snap=>{snap.quality.currentDayPartial=false},
    snap=>{snap.source.username='other'},
    snap=>{snap.calendar.days=364},
    snap=>{snap.asOf='2026-10-09T14:03:01.000Z'}
  ]) {
    const broken=clone();tamper(broken);
    assert.throws(()=>validateContributionSnapshot(broken));
  }
});

test('same frozen snapshot generates byte-identical public charts, even if the raw source Map mutates', () => {
  const raw=input(), snapshot=createContributionSnapshot(raw);
  const normalized={...raw,snapshot};
  const before=createAssetBundle(normalized);
  raw.counts.set(endDate,9999);
  const after=createAssetBundle(normalized);
  assert.deepEqual(after.assets,before.assets);
  assert.deepEqual(after.manifest,before.manifest);
});
