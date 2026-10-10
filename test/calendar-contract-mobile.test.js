'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {utcWindow,parseIsoDay} = require('../contribution-snapshot');
const {buildSeries,createMeta} = require('../generate-commit-chart');
const {createAssetBundle} = require('../build-activity-assets');
const {validateContributionSeries} = require('../chart-contract');

const AS_OF='2026-10-10T23:30:00.000Z';
function snapshot(){
  const {startDate,endDate}=utcWindow(AS_OF);
  const counts=new Map();let ms=parseIsoDay(startDate);
  for(let i=0;i<365;i++,ms+=86400000){
    counts.set(new Date(ms).toISOString().slice(0,10),i%7===0?0:i%17);
  }
  const source={asOf:AS_OF,counts,startDate,endDate,sourceDetails:{type:'github',username:'dturovskiy'}};
  const series=buildSeries(counts,startDate,endDate);
  return {source,series,meta:createMeta({days:30},source,series)};
}
test('contract verifies 365 contiguous UTC days, totals, MA7 and snapshot hash',()=>{
  const {series,meta}=snapshot(),report=validateContributionSeries(series,meta);
  assert.equal(report.firstDate,'2025-10-11');
  assert.equal(report.lastDate,'2026-10-10');
  assert.equal(report.total,meta.totalCommits);
  assert.equal(report.snapshotId,meta.snapshotId);
});
test('contract rejects gaps, missing days and wrong current-day bounds',()=>{
  const {series,meta}=snapshot();
  assert.throws(()=>validateContributionSeries(series.slice(1),meta),/365 days/);
  const gap=series.map(x=>({...x}));gap[13].date='2025-11-99';
  assert.throws(()=>validateContributionSeries(gap,meta),/Invalid daily/);
  assert.throws(()=>validateContributionSeries(series,{...meta,endDate:'2026-10-09'}),/date range/);
  assert.throws(()=>validateContributionSeries(series,{...meta,generatedAt:'2026-10-11T00:00:00.000Z'}),/end on the UTC/);
});
test('contract rejects fabricated cumulative totals, trends and identity',()=>{
  const {series,meta}=snapshot();
  const a=series.map(x=>({...x}));a[22].ma7+=.01;
  assert.throws(()=>validateContributionSeries(a,meta),/seven-day moving average/);
  const b=series.map(x=>({...x}));b[22].cumulative+=1;
  assert.throws(()=>validateContributionSeries(b,meta),/cumulative/);
  assert.throws(()=>validateContributionSeries(series,{...meta,snapshotId:'0'.repeat(64)}),/hash/);
  assert.throws(()=>validateContributionSeries(series,{...meta,totalCommits:meta.totalCommits+1}),/summary totals/);
});
test('UTC date boundaries cover leap day, DST crossover and year boundary',()=>{
  assert.equal(utcWindow('2024-03-01T01:00:00Z',2).startDate,'2024-02-29');
  assert.equal(utcWindow('2026-01-01T00:05:00Z',2).startDate,'2025-12-31');
  assert.equal(utcWindow('2026-03-29T00:05:00Z',3).startDate,'2026-03-27');
  assert.equal(utcWindow('2026-10-25T00:05:00Z',3).startDate,'2026-10-23');
  assert.throws(()=>parseIsoDay('2026-02-29'),/Invalid ISO/);
  assert.throws(()=>parseIsoDay('2026-03-32'),/Invalid ISO/);
});
test('fixed UTC clock is identical in New York, Kyiv, Tokyo and UTC processes',()=>{
  const js=[
    "const {utcWindow}=require('./contribution-snapshot');",
    "const {buildSeries,createMeta}=require('./generate-commit-chart');",
    "const w=utcWindow('2026-03-29T00:10:00Z');",
    "const m=new Map([[w.startDate,7],[w.endDate,17]]);",
    "const s=buildSeries(m,w.startDate,w.endDate);",
    "const z={asOf:'2026-03-29T00:10:00.000Z',counts:m,startDate:w.startDate,endDate:w.endDate,sourceDetails:{type:'github',username:'fixed'}};",
    "process.stdout.write(JSON.stringify({start:w.startDate,end:w.endDate,series:s,sha:createMeta({days:30},z,s).snapshotId}));"
  ].join('');
  const results=['UTC','America/New_York','Europe/Kyiv','Asia/Tokyo'].map(TZ=>{
    const r=spawnSync(process.execPath,['-e',js],{cwd:require('node:path').join(__dirname,'..'),
      env:{...process.env,TZ},encoding:'utf8',timeout:5000});
    assert.equal(r.status,0,TZ+': '+r.stderr);
    return r.stdout;
  });
  assert.ok(results.every(r=>r===results[0]),'timezone independent snapshot');
});
test('mobile HTML scrolls full-size chart with touch and keyboard affordances',()=>{
  const html=createAssetBundle(snapshot().source).assets['index.html'];
  assert.match(html,/id="chart-scroll" role="region" aria-label="Scrollable daily contribution chart"/);
  assert.match(html,/tabindex="0"/);
  assert.match(html,/overflow-x:auto/);
  assert.match(html,/#chart\{min-width:1120px;min-height:0\}/);
  assert.match(html,/Swipe sideways to view all days/);
  assert.match(html,/scrollLeft=scroller.scrollWidth/);
  assert.match(html,/aria-describedby="chart-scroll-hint"/);
});

test('both chart themes have WCAG AA contrast for labels and visual series',()=>{
  const {THEMES}=require('../modern-renderer');
  function luminance(hex){
    const channels=hex.match(/[0-9a-f]{2}/gi).map(s=>parseInt(s,16)/255);
    const linear=channels.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
    return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
  }
  function contrast(a,b){
    const x=luminance(a),y=luminance(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  for(const [name,colors] of Object.entries(THEMES)){
    for(const key of ['text','muted','daily','trend']){
      assert.ok(contrast(colors[key],colors.background)>=4.5,name+' '+key+' has adequate contrast');
    }
  }
});

test('local Git author timestamps are assigned to UTC day, not author timezone day',()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const {readLocalGitDailyCounts}=require('../generate-commit-chart');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chart-utc-local-'));
  function run(args,env){
    const r=spawnSync('git',args,{cwd:dir,env:{...process.env,...env},encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||args.join(' '));
  }
  try{
    run(['init','-q','-b','main']);
    run(['config','user.name','Chart Test']);
    run(['config','user.email','test@example.invalid']);
    fs.writeFileSync(path.join(dir,'fixture'),'x');
    run(['add','fixture']);
    const env={GIT_AUTHOR_DATE:'2026-03-29T00:30:00 +0300',
      GIT_COMMITTER_DATE:'2026-03-29T00:30:00 +0300'};
    run(['commit','-q','-m','offset-crosses-midnight'],env);
    const actual=readLocalGitDailyCounts(dir,'main','',new Date('2026-03-29T12:00:00Z'));
    assert.equal(actual.counts.get('2026-03-28'),1);
    assert.equal(actual.counts.has('2026-03-29'),false);
    assert.equal(actual.endDate,'2026-03-29');
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
