'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { classifyScheduledDelivery } = require('../ci/check-run-delivery');

const now = '2026-10-14T20:00:00Z';
const run = (id, event, time, conclusion = 'success', status = 'completed') =>
  ({ id, event, created_at: time, conclusion, status });
const classify = (workflow_runs, more = {}) =>
  classifyScheduledDelivery({ workflow_runs }, { now, ...more });

test('recent scheduled success is healthy even when no asset was published', () => {
  const r = classify([
    run(1, 'schedule', '2026-10-14T19:45:00Z'),
    run(2, 'workflow_dispatch', '2026-10-14T19:55:00Z')
  ]);
  assert.equal(r.status, 'healthy');
  assert.equal(r.lastScheduledRun.id, 1);
  assert.equal(r.lastSuccessfulCheck.id, 2);
  assert.equal(r.snapshotPublicationTimeIsNotCheckTime, true);
});

test('successful manual and push runs do not conceal undelivered schedule', () => {
  const r = classify([
    run(3, 'push', '2026-10-14T19:55:00Z'),
    run(1, 'schedule', '2026-10-14T17:59:59Z'),
    run(2, 'workflow_dispatch', '2026-10-14T19:58:00Z')
  ]);
  assert.equal(r.status, 'schedule_delivery_gap');
  assert.equal(r.lastSuccessfulCheck.id, 2);
  assert.equal(r.lastScheduledRun.id, 1);
  assert.ok(r.scheduleGapHours > 2);
});

test('no schedule events is reported separately from latest successful push', () => {
  const r = classify([run(6, 'push', '2026-10-14T19:59:00Z')]);
  assert.equal(r.status, 'schedule_delivery_gap');
  assert.equal(r.lastScheduledRun, null);
  assert.equal(r.scheduleGapHours, null);
  assert.equal(r.lastSuccessfulCheck.id, 6);
});

test('recent scheduled failures and in-progress runs have distinct classifications', () => {
  assert.equal(classify([run(4, 'schedule', '2026-10-14T19:30:00Z', 'failure')]).status,
    'schedule_failed');
  assert.equal(classify([run(5, 'schedule', '2026-10-14T19:30:00Z', null, 'in_progress')]).status,
    'schedule_in_progress');
});

test('malformed API data, invalid thresholds and future timestamps fail closed', () => {
  assert.throws(() => classifyScheduledDelivery({}, { now }), /workflow-run response/);
  assert.throws(() => classify([run(1, 'schedule', 'not-a-time')]), /timestamp/);
  assert.throws(() => classify([run(1, 'schedule', '2026-10-14T20:11:00Z')]), /timestamp/);
  assert.throws(() => classify([], { maxGapHours: 0 }), /threshold/);
  assert.throws(() => classify([run(1, 'pull_request', '2026-10-14T19:00:00Z')]),
    /Unexpected Actions workflow run/);
});

test('CLI makes stale schedule delivery actionable without reporting an asset failure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-schedule-diagnostic-'));
  const file = path.join(root, 'runs.json');
  try {
    fs.writeFileSync(file, JSON.stringify({
      workflow_runs: [run(1, 'schedule', '2026-10-14T11:00:00Z')]
    }));
    const result = spawnSync(process.execPath,
      [path.join(__dirname, '../ci/check-run-delivery.js'), file], {
        encoding: 'utf8',
        env: { ...process.env, CHART_MAX_SCHEDULE_GAP_HOURS: '2' }
      });
    // The archived fixture is old relative to wall clock; classification is a gap.
    assert.equal(result.status, 1);
    assert.match(result.stdout, /SCHEDULE_DELIVERY .*schedule_delivery_gap/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
