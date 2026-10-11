#!/usr/bin/env node
'use strict';

// One manual, read-only observation: capture the GraphQL reply only in memory,
// build candidate SVG/HTML from that *same* reply, and independently compare
// every day and all three range totals. No secrets or raw payload are logged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadContributionSource } = require('../source-adapters');
const { createAssetBundle, writeBundle } = require('../build-activity-assets');
const { verifyDirectory } = require('../verify-activity-assets');

function capturedCounts(payload, startDate, endDate) {
  const user=payload?.data?.user;
  const primary=user?.contributionsCollection?.contributionCalendar?.weeks;
  const edge=user?.edge?.contributionCalendar?.weeks;
  if(!Array.isArray(primary)||!Array.isArray(edge))throw Error('Incomplete captured GraphQL calendar structure');
  const observed=new Map();
  for(const segment of [primary,edge])for(const week of segment) {
    if(!Array.isArray(week.contributionDays))throw Error('Invalid captured calendar week');
    for(const {date,contributionCount} of week.contributionDays) {
      if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
         !Number.isSafeInteger(contributionCount)||contributionCount<0) {
        throw Error('Invalid captured calendar datum');
      }
      if(date<startDate||date>endDate)continue;
      if(observed.has(date)&&observed.get(date)!==contributionCount) {
        throw Error('Inconsistent overlapping capture');
      }
      observed.set(date,contributionCount);
    }
  }
  const days=[];
  const start=Date.parse(startDate+'T00:00:00Z');
  for(let i=0;i<365;i++) {
    const date=new Date(start+i*86400000).toISOString().slice(0,10);
    if(!observed.has(date))throw Error('Missing calendar date in captured API response: '+date);
    days.push({date,commits:observed.get(date)});
  }
  if(days.at(-1).date!==endDate||observed.size!==365)throw Error('Invalid captured calendar range');
  return days;
}

function verifyCapturedCandidate(payload, result) {
  const { source, bundle }=result;
  const days=capturedCounts(payload,source.startDate,source.endDate);
  const html=bundle.assets['index.html'];
  const embedded=html.match(/<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/);
  if(!embedded)throw Error('Candidate HTML missing embedded observation');
  const chart=JSON.parse(embedded[1]);
  assert.equal(chart.meta.snapshotId,bundle.manifest.snapshotId);
  assert.equal(chart.meta.generatedAt,source.asOf);
  assert.equal(chart.data.length,365);
  for(let i=0;i<365;i++) {
    assert.equal(chart.data[i].date,days[i].date);
    assert.equal(chart.data[i].commits,days[i].commits);
    assert.equal(source.counts.get(days[i].date),days[i].commits);
  }
  const totals={};
  for(const n of [30,90,365]) {
    const count=days.slice(-n).reduce((sum,d)=>sum+d.commits,0);
    assert.equal(bundle.manifest.ranges[n].total,count);
    assert.equal(chart.data.slice(-n).reduce((sum,d)=>sum+d.commits,0),count);
    assert.ok(bundle.assets['activity-'+n+'d.svg'].includes(n+' days · '+count+' contributions'));
    totals[n]=count;
  }
  assert.equal(bundle.manifest.publicDataPolicy,'daily-aggregates-only-v1');
  for(const asset of Object.values(bundle.assets)) {
    assert.doesNotMatch(asset,/restrictedContributionsCount|hasAnyRestrictedContributions|totalCommitContributions/);
  }
  return totals;
}

async function main() {
  const username=process.argv[2];
  const token=process.env.DEUS_COMMIT_CHART_GITHUB_TOKEN||process.env.GITHUB_TOKEN;
  if(!username||!token)throw Error('Manual canary requires GitHub login and environment token');
  const asOf=new Date();
  let captured, calls=0;
  const fetchImpl=async (url,options)=>{
    calls++;
    const response=await fetch(url,options);
    captured=await response.json(); // never serialize this raw payload to disk
    return {ok:response.ok,status:response.status,json:async()=>captured};
  };
  const source=await loadContributionSource({source:'github',username},{
    asOf,token,attempts:1,fetchImpl
  });
  assert.equal(calls,1,'Expected one captured API observation');
  const bundle=createAssetBundle(source);
  const totals=verifyCapturedCandidate(captured,{source,bundle});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chart-live-observation-'));
  try {
    const destination=path.join(temp,'assets');
    writeBundle(destination,bundle.assets);
    assert.equal(verifyDirectory(destination).snapshotId,bundle.manifest.snapshotId);
    const xml=spawnSync('python3',['ci/validate-svg.py',destination],
      {cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:30000});
    assert.equal(xml.status,0,'SVG XML/safety validation failed');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  console.log('LIVE_API_CANDIDATE_PASS: asOf='+source.asOf+
    ', 365 UTC days, 30d='+totals[30]+', 90d='+totals[90]+', 365d='+totals[365]+
    ', snapshot='+bundle.manifest.snapshotId.slice(0,12));
}
if(require.main===module)main().catch(()=>{
  // Keep token and raw GraphQL payload out of failure logs.
  console.error('LIVE_API_CANDIDATE_FAILURE: captured-response verification failed; inspect source/CI privately');
  process.exitCode=1;
});
module.exports={capturedCounts,verifyCapturedCandidate};
