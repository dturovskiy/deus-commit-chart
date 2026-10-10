'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadContributionSource } = require('../source-adapters');
const { readLocalGitDailyCounts, GIT_TIMEOUT_MS, GIT_MAX_BUFFER } = require('../local-git-source');

const now = '2026-10-10T19:22:00.000Z';

function localFixture(stdout, seen) {
  return {
    spawnSyncImpl(binary, args, opts) {
      seen.push({binary, args, opts});
      return {status:0, stdout, stderr:''};
    }
  };
}

test('source router provides normalized offline local calendar with bounded git subprocess', async () => {
  const seen = [];
  const source = await loadContributionSource(
    { source:'local', repo:'/tmp/chart-sample', branch:'main', author:'Example Dev' },
    { asOf:now, ...localFixture([
      '2026-10-10T23:45:00+05:00', // 18:45 UTC Oct 10
      '2026-10-11T00:30:00+05:00', // 19:30 UTC Oct 10
      '2026-10-12T00:00:00+00:00', // a future commit; filtered
      '2026-10-09T23:00:00-03:00'  // 02:00 UTC Oct 10
    ].join('\n'),seen) }
  );
  assert.equal(seen.length,1);
  assert.equal(seen[0].binary,'git');
  assert.deepEqual(seen[0].args,[
    '-C','/tmp/chart-sample','log','--format=%aI','--author=Example Dev','main'
  ]);
  assert.equal(seen[0].opts.timeout,GIT_TIMEOUT_MS);
  assert.equal(seen[0].opts.maxBuffer,GIT_MAX_BUFFER);
  assert.equal(source.counts.get('2026-10-10'),3);
  assert.equal(source.counts.has('2026-10-12'),false);
  assert.equal(source.endDate,'2026-10-10');
  assert.equal(source.sourceDetails.type,'local');
  assert.equal(source.sourceDetails.repo,'chart-sample');
  assert.equal(source.asOf,now);
});

test('GitHub source is dispatched once and shares the same shape', async () => {
  const { utcWindow } = require('../contribution-snapshot');
  const window = utcWindow(now);
  const days = Array.from({length:365},(_,i)=>({
    date:new Date(Date.parse(window.from)+i*86400000).toISOString().slice(0,10),
    contributionCount: i===364?13:0
  }));
  let calls=0;
  const source=await loadContributionSource({source:'github',username:'dturovskiy'},{
    asOf:now,token:'fixture-only',attempts:1,
    fetchImpl:async()=>{calls++;return{ok:true,status:200,json:async()=>({
      data:{user:{
        contributionsCollection:{contributionCalendar:{weeks:[{contributionDays:days}]}},
        edge:{contributionCalendar:{weeks:[{contributionDays:days.slice(0,15)}]}}
      }}
    })}}
  });
  assert.equal(calls,1);
  assert.equal(source.sourceDetails.type,'github');
  assert.equal(source.counts.size,365);
  assert.equal(source.counts.get('2026-10-10'),13);
  assert.equal(source.asOf,now);
});

test('local adapter rejects unsafe ref, invalid git text and hard process failures', () => {
  for(const branch of ['--all','-p','',null]){
    assert.throws(()=>readLocalGitDailyCounts('/tmp/chart',branch,'',now),/Invalid local Git branch\/ref/);
  }
  const invalid=localFixture('not-a-timestamp\n',[]);
  assert.throws(()=>readLocalGitDailyCounts('/tmp/chart','main','',now,invalid),/Invalid Git author timestamp/);
  assert.throws(()=>readLocalGitDailyCounts('/tmp/chart','main','',now,{
    spawnSyncImpl:()=>({status:null,error:new Error('ETIMEDOUT')})
  }),/ETIMEDOUT/);
  assert.throws(()=>readLocalGitDailyCounts('/tmp/chart','main','',now,{
    spawnSyncImpl:()=>({status:128,stderr:'fatal: bad revision'})
  }),/fatal: bad revision/);
  assert.throws(()=>readLocalGitDailyCounts('/tmp/chart','main','',now,localFixture('',[])),
    /No commits found/);
});

test('source router rejects invalid settings and clocks without running a subprocess',async()=>{
  await assert.rejects(()=>loadContributionSource({source:'none'},{asOf:now}),/Source must be/);
  await assert.rejects(()=>loadContributionSource({source:'local'},{asOf:'invalid-date'}),/Invalid source asOf/);
});
