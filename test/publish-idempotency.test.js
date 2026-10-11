'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { utcWindow } = require('../contribution-snapshot');
const { createAssetBundle, writeBundle } = require('../build-activity-assets');
const { canReusePublishedSnapshot } = require('../ci/should-publish');

const SHA_A = 'a'.repeat(40), SHA_B = 'b'.repeat(40);

function makeDirectory(parent, name, timestamp, sourceCommit = SHA_A, lastDayCount = 4) {
  const { startDate, endDate } = utcWindow(timestamp);
  const counts = new Map();
  const start = Date.parse(startDate + 'T00:00:00Z');
  for (let i = 0; i < 365; i++) {
    const date = new Date(start + i * 86400000).toISOString().slice(0,10);
    counts.set(date, i === 364 ? lastDayCount : 0);
  }
  const source = {
    asOf: timestamp, counts, startDate, endDate,
    sourceDetails: { type:'github', username:'dturovskiy' }
  };
  const dir = path.join(parent, name);
  writeBundle(dir, createAssetBundle(source).assets);
  const filename = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  manifest.sourceCommit = sourceCommit;
  manifest.workflowRun = String(name);
  fs.writeFileSync(filename, JSON.stringify(manifest, null, 2) + '\n');
  return dir;
}
function inFixture(callback) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-noop-'));
  try { callback(parent); }
  finally { fs.rmSync(parent, { recursive: true, force: true }); }
}

test('reuse an independently verified publication when only build time/run changed', () => inFixture(parent => {
  const prior = makeDirectory(parent, 'prior', '2026-10-10T12:00:00Z');
  const next = makeDirectory(parent, 'next', '2026-10-10T18:00:00Z');
  assert.notEqual(fs.readFileSync(path.join(prior,'manifest.json'),'utf8'),
    fs.readFileSync(path.join(next,'manifest.json'),'utf8'));
  assert.deepEqual(canReusePublishedSnapshot(prior,next), {
    reuse:true, reason:'same-validated-data-and-generator-revision'
  });
  const cli = spawnSync(process.execPath, ['ci/should-publish.js',prior,next], {
    cwd:path.join(__dirname,'..'), encoding:'utf8'
  });
  assert.equal(cli.status,0,cli.stderr);
  assert.equal(JSON.parse(cli.stdout).reuse,true);
}));

test('new daily observations, new UTC date or changed source revision force refresh', () => inFixture(parent => {
  const prior = makeDirectory(parent, 'prior','2026-10-10T12:00:00Z');
  const increment = makeDirectory(parent, 'increment','2026-10-10T18:00:00Z',SHA_A,5);
  const nextDay = makeDirectory(parent, 'nextday','2026-10-11T01:00:00Z');
  const newCode = makeDirectory(parent, 'newcode','2026-10-10T18:00:00Z',SHA_B);
  for (const dir of [increment,nextDay,newCode]) {
    assert.equal(canReusePublishedSnapshot(prior,dir).reuse,false);
  }
  assert.equal(canReusePublishedSnapshot(prior,newCode).reason,'sourceCommit-changed');
  const cli = spawnSync(process.execPath,['ci/should-publish.js',prior,newCode],{
    cwd:path.join(__dirname,'..'),encoding:'utf8'
  });
  assert.equal(cli.status,1,cli.stderr);
}));

test('an unknown source revision never conceals a new rollout', () => inFixture(parent => {
  const prior = makeDirectory(parent, 'prior','2026-10-10T12:00:00Z',null);
  const next = makeDirectory(parent, 'next','2026-10-10T18:00:00Z',null);
  assert.equal(canReusePublishedSnapshot(prior,next).reason,'unknown-source-revision');
}));

test('corrupted old publication is replaced, corrupted new candidate fails hard', () => inFixture(parent => {
  const prior = makeDirectory(parent, 'prior','2026-10-10T12:00:00Z');
  const next = makeDirectory(parent, 'next','2026-10-10T18:00:00Z');
  fs.appendFileSync(path.join(prior,'activity-30d.svg'),'<!-- corruption -->');
  assert.match(canReusePublishedSnapshot(prior,next).reason,/previous-invalid/);
  fs.appendFileSync(path.join(next,'activity-30d.svg'),'<!-- corruption -->');
  assert.throws(() => canReusePublishedSnapshot(prior,next),/checksum mismatch/i);
  const cli = spawnSync(process.execPath,['ci/should-publish.js',prior,next],{
    cwd:path.join(__dirname,'..'),encoding:'utf8'
  });
  assert.equal(cli.status,2);
  assert.match(cli.stderr,/PUBLISH_DECISION_ERROR/);
}));
