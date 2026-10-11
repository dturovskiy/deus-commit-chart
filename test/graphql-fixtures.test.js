'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { utcWindow, fetchGithubDailyCounts, GitHubSourceError } =
  require('../contribution-snapshot');

const CLOCK = '2026-10-10T12:00:00.000Z';
const TOKEN = 'SYNTHETIC_FIXTURE_CREDENTIAL_DO_NOT_USE';

function calendar() {
  const { startDate, endDate } = utcWindow(CLOCK);
  const days = [];
  for (let ms = Date.parse(startDate + 'T00:00:00Z'); ms <= Date.parse(endDate + 'T00:00:00Z'); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    days.push({ date, contributionCount: date === endDate ? 15 : date === '2026-10-09' ? 3 : 0 });
  }
  return days;
}

function fixtureResponse(primary, edge, overrides = {}) {
  return {
    ok: true, status: 200,
    json: async () => ({ data: { user: {
      contributionsCollection: {
        contributionCalendar: { weeks: [{ contributionDays: primary }] },
        restrictedContributionsCount: overrides.privateCount ?? 9000,
        hasAnyRestrictedContributions: true,
        totalCommitContributions: 9999
      },
      edge: { contributionCalendar: { weeks: [{ contributionDays: edge }] } }
    } } })
  };
}
function options(fetchImpl, extra={}) {
  return { token:TOKEN, asOf:CLOCK, attempts:2, sleep:async()=>{}, fetchImpl, ...extra };
}
function checkNoPrivateFields(output) {
  assert.deepEqual(output.sourceDetails, { type:'github', username:'testuser' });
  assert.ok(!('restrictedContributionsCount' in output.sourceDetails));
  assert.doesNotMatch(JSON.stringify(output), /SYNTHETIC_FIXTURE_CREDENTIAL_DO_NOT_USE|restrictedContributionsCount/);
}

test('GraphQL full calendar: one request, boundary recovery, fixed 3→15, and aggregate-only visibility', async () => {
  const days = calendar();
  for(const privateCount of [0, 9000]) {
    let calls=0;
    const result=await fetchGithubDailyCounts('testuser', options(async (url, request) => {
      calls++;
      assert.equal(url,'https://api.github.com/graphql');
      assert.equal(request.headers.Authorization,'Bearer ' + TOKEN);
      assert.doesNotMatch(request.body,/restrictedContributionsCount|hasAnyRestrictedContributions|totalCommitContributions/);
      return fixtureResponse(days.slice(1), days.slice(0,17), { privateCount });
    }));
    assert.equal(calls,1);
    assert.equal(result.counts.size,365);
    assert.equal(result.counts.get('2026-10-09'),3);
    assert.equal(result.counts.get('2026-10-10'),15);
    assert.equal([...result.counts.values()].reduce((a,b)=>a+b,0),18);
    checkNoPrivateFields(result);
  }
});

test('GraphQL missing a non-boundary date fails closed instead of becoming zero activity', async () => {
  const days = calendar(), missing = days[180].date;
  const result = fetchGithubDailyCounts('testuser',options(async()=>
    fixtureResponse(days.filter(d=>d.date!==missing), days.slice(0,15))));
  await assert.rejects(result, error => {
    assert.match(error.message,/Incomplete GitHub calendar/);
    assert.ok(error.message.includes(missing));
    return true;
  });
});

test('GraphQL invalid, duplicate and inconsistent boundary data are rejected', async () => {
  const days=calendar();
  const variants=[
    [days.map((d,i)=>i===60?{...d,contributionCount:-1}:d),days.slice(0,15),/Invalid GitHub segment contribution count/],
    [[...days, { ...days[22], contributionCount: 999 }],days.slice(0,15),/Inconsistent overlapping/],
    [days, days.slice(0,15).map((d,i)=>i===0?{...d,contributionCount:444}:d),/Inconsistent overlapping/]
  ];
  for(const [primary,edge,pattern] of variants) {
    await assert.rejects(()=>fetchGithubDailyCounts('testuser',options(async()=>fixtureResponse(primary,edge))),pattern);
  }
});

test('GraphQL permission, rate limit and transient server fixture retry policy', async () => {
  for(const [status,expectedCode,expectedCalls] of [
    [401,'authentication',1],[403,'authorization',1],[429,'rate_limited',2],[503,'server_error',2]
  ]) {
    let calls=0;
    await assert.rejects(fetchGithubDailyCounts('testuser',options(async()=>{calls++;return{ok:false,status}})),
      error => {
        assert.ok(error instanceof GitHubSourceError);
        assert.equal(error.code,expectedCode);
        assert.equal(error.attempts,expectedCalls);
        assert.doesNotMatch(error.message,/SYNTHETIC_FIXTURE_CREDENTIAL_DO_NOT_USE/);
        return true;
      });
    assert.equal(calls,expectedCalls);
  }
});

test('GraphQL temporary server failure recovers on the bounded second attempt',async()=>{
  let calls=0;const days=calendar();
  const result=await fetchGithubDailyCounts('testuser',options(async()=>{
    calls++;
    return calls===1 ? {ok:false,status:502} : fixtureResponse(days,days.slice(0,15));
  }));
  assert.equal(calls,2);
  assert.equal(result.counts.get('2026-10-10'),15);
  checkNoPrivateFields(result);
});

test('GraphQL timed-out requests are aborted and never retried forever',async()=>{
  let calls=0;
  await assert.rejects(fetchGithubDailyCounts('testuser',options(async(_,request)=>{
    calls++;return new Promise((resolve,reject)=>{
      request.signal.addEventListener('abort',()=>reject(new Error('aborted')), {once:true});
    });
  },{timeoutMs:5})),error=>{
    assert.equal(error.code,'timeout');
    assert.equal(error.attempts,2);
    assert.doesNotMatch(error.message,/SYNTHETIC_FIXTURE_CREDENTIAL_DO_NOT_USE/);
    return true;
  });
  assert.equal(calls,2);
});
