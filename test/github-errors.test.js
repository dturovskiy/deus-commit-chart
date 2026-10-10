'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchGithubDailyCounts, GitHubSourceError, githubHttpCategory } =
  require('../contribution-snapshot');
const FIXED = {token:'fixture',asOf:'2026-10-10T12:00:00Z',attempts:2,sleep:async()=>{}};

test('GitHub source errors have stable, token-free categories and status', async()=>{
  for(const [httpStatus,code,expectedCalls] of [
    [401,'authentication',1], [403,'authorization',1],
    [429,'rate_limited',2], [502,'server_error',2], [400,'http_client_error',1]
  ]){
    let calls=0;
    await assert.rejects(
      fetchGithubDailyCounts('dturovskiy',{...FIXED,fetchImpl:async()=>{
        calls++;return{ok:false,status:httpStatus};
      }}),
      error=>{
        assert.ok(error instanceof GitHubSourceError);
        assert.equal(error.code,code);
        assert.equal(error.status,httpStatus);
        assert.equal(error.attempts,expectedCalls);
        assert.doesNotMatch(error.message,/fixture/);
        return true;
      }
    );
    assert.equal(calls,expectedCalls);
    assert.equal(githubHttpCategory(httpStatus),code);
  }
});

test('GraphQL semantic failure and malformed JSON are permanent categories',async()=>{
  for(const [response,code] of [
    [{ok:true,status:200,json:async()=>({errors:[{message:'FORBIDDEN'}]})},'graphql_error'],
    [{ok:true,status:200,json:async()=>{throw new SyntaxError('bad JSON');}},'malformed_json']
  ]){
    let calls=0;
    await assert.rejects(fetchGithubDailyCounts('dturovskiy',{
      ...FIXED,fetchImpl:async()=>{calls++;return response;}
    }),error=>{
      assert.equal(error.code,code);
      assert.equal(error.attempts,1);
      return true;
    });
    assert.equal(calls,1);
  }
});

test('transport failures remain retryable and yield a network category',async()=>{
  let calls=0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy',{
    ...FIXED,fetchImpl:async()=>{calls++;throw new Error('ECONNRESET');}
  }),error=>{
    assert.equal(error.code,'network_error');
    assert.equal(error.status,null);
    assert.equal(error.attempts,2);
    return true;
  });
  assert.equal(calls,2);
});

test('expired GitHub request has a distinct timeout category and bounded attempts',async()=>{
  let calls=0;
  await assert.rejects(fetchGithubDailyCounts('dturovskiy',{
    ...FIXED,timeoutMs:6,fetchImpl:async(_url,options)=>{
      calls++;
      return new Promise((_resolve,reject)=>{
        options.signal.addEventListener('abort',()=>reject(new Error('aborted')), {once:true});
      });
    }
  }),error=>{
    assert.equal(error.code,'timeout');
    assert.match(error.message,/request timed out/);
    assert.equal(error.attempts,2);
    return true;
  });
  assert.equal(calls,2);
});
