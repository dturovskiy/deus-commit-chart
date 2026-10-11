'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkFreshness } = require('../ci/check-freshness');

const stamp = '2026-10-10T20:00:00.000Z';
function fixture() {
  return {
    schemaVersion: 1,
    snapshotId: 'a'.repeat(64),
    generatedAt: stamp,
    calendarDays: 365,
    rangeEnd: '2026-10-10',
    sourceCommit: 'b'.repeat(40),
    workflowRun: '123',
    ranges: {
      30: { total: 10, endDate: '2026-10-10' },
      90: { total: 40, endDate: '2026-10-10' },
      365: { total: 100, endDate: '2026-10-10' }
    }
  };
}

test('published snapshot is healthy below the 8-hour threshold', () => {
  const result = checkFreshness(fixture(), { now: '2026-10-11T03:59:59Z' });
  assert.equal(result.status, 'healthy');
  assert.ok(result.ageHours < 8);
  assert.equal(result.snapshotId, 'a'.repeat(64));
});

test('published snapshot rejects stale data exactly after the deadline', () => {
  assert.doesNotThrow(() => checkFreshness(fixture(), { now: '2026-10-11T04:00:00Z' }));
  assert.throws(() => checkFreshness(fixture(), { now: '2026-10-11T04:00:01Z' }), /stale/);
  assert.throws(() => checkFreshness(fixture(), { now: '2026-10-11T01:00:00Z', maxAgeHours: 2 }), /threshold=2h/);
});

test('malformed, missing and future publication timestamps fail closed', () => {
  assert.throws(() => checkFreshness(null), /metadata/);
  assert.throws(() => checkFreshness({ ...fixture(), snapshotId: 'bad' }), /metadata/);
  assert.throws(() => checkFreshness({ ...fixture(), generatedAt: 'nonsense' }), /metadata/);
  assert.throws(() => checkFreshness(fixture(), { now: '2026-10-10T19:49:59Z' }), /future/);
  assert.doesNotThrow(() => checkFreshness(fixture(), { now: '2026-10-10T19:50:00Z' }));
  assert.throws(() => checkFreshness(fixture(), { maxAgeHours: -1 }), /threshold/);
});

test('incomplete or inconsistent snapshot range metadata fails closed', () => {
  // Keep test time frozen. Never compare a historical fixture to wall-clock time:
  // this broke scheduled publish once the fixture became older than 8 hours.
  const options = { now: '2026-10-10T21:00:00Z' };
  const v = fixture();
  delete v.ranges['90'];
  assert.throws(() => checkFreshness(v, options), /range metadata/);
  const w = fixture();
  w.ranges[365].endDate = '2026-10-09';
  assert.throws(() => checkFreshness(w, options), /calendar coverage/);
  const z = fixture();
  z.calendarDays = 364;
  assert.throws(() => checkFreshness(z, options), /calendar coverage/);
});

test('malformed range metadata is rejected even for an already stale snapshot', () => {
  const staleClock = { now: '2026-10-12T21:00:00Z' };
  const malformed = fixture();
  delete malformed.ranges['90'];
  assert.throws(() => checkFreshness(malformed, staleClock), /range metadata/);
  assert.throws(() => checkFreshness(fixture(), staleClock), /stale/);
});

test('CLI exit code can drive an automated monitoring job', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-health-'));
  const manifest = path.join(dir, 'manifest.json');
  try {
    fs.writeFileSync(manifest, JSON.stringify(fixture()), 'utf8');
    const binary = process.execPath;
    const script = path.join(__dirname, '../ci/check-freshness.js');
    const stale = spawnSync(binary, [script, manifest], {
      encoding: 'utf8', env: { ...process.env, CHART_MAX_AGE_HOURS: '0.01' }
    });
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /CHART_FRESHNESS_FAILURE/);
    fs.writeFileSync(manifest, '{}');
    const malformed = spawnSync(binary, [script, manifest], { encoding: 'utf8' });
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /metadata/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
