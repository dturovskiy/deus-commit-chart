'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { utcWindow }=require('../contribution-snapshot');
const { createAssetBundle }=require('../build-activity-assets');
const { capturedCounts,verifyCapturedCandidate }=require('../ci/live-api-candidate');

const asOf='2026-10-10T12:00:00.000Z';
function fixture() {
  const range=utcWindow(asOf),counts=new Map();
  const start=Date.parse(range.startDate+'T00:00:00Z');
  const days=Array.from({length:365},(_,i)=>{
    const date=new Date(start+i*86400000).toISOString().slice(0,10);
    const contributionCount=i===364?15:i===363?3:i===0?7:0;
    counts.set(date,contributionCount);
    return{date,contributionCount};
  });
  const source={counts,startDate:range.startDate,endDate:range.endDate,asOf,
    sourceDetails:{type:'github',username:'fixture-user'}};
  const payload={data:{user:{
    contributionsCollection:{contributionCalendar:{weeks:[{contributionDays:days.slice(1)}]}},
    edge:{contributionCalendar:{weeks:[{contributionDays:days.slice(0,17)}]}}
  }}};
  return {source,payload,bundle:createAssetBundle(source),days};
}
test('manual live candidate verifier compares all 365 captured days and 30/90/365 totals',()=>{
  const f=fixture();
  assert.equal(capturedCounts(f.payload,f.source.startDate,f.source.endDate).length,365);
  assert.deepEqual(verifyCapturedCandidate(f.payload,{source:f.source,bundle:f.bundle}),{
    30:18,90:18,365:25
  });
});
test('candidate verification fails on malformed capture, omitted days and inconsistent edge',()=>{
  for(const mutate of [
    p=>p.data.user.contributionsCollection.contributionCalendar.weeks[0].contributionDays.splice(80,1),
    p=>p.data.user.edge.contributionCalendar.weeks[0].contributionDays[0].contributionCount=123,
    p=>p.data.user.edge.contributionCalendar.weeks[0].contributionDays[0].contributionCount=-1,
    p=>p.data.user.edge=null
  ]) {
    const f=fixture();
    mutate(f.payload);
    assert.throws(()=>verifyCapturedCandidate(f.payload,{source:f.source,bundle:f.bundle}));
  }
});
test('candidate verification detects altered output despite a plausible manifest',()=>{
  const f=fixture();
  f.bundle.manifest.ranges[30].total++;
  assert.throws(()=>verifyCapturedCandidate(f.payload,{source:f.source,bundle:f.bundle}),/Expected values to be strictly equal/);
});
