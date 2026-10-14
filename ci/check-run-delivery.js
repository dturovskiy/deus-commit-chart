'use strict';

const fs = require('node:fs');

const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;

function classifyScheduledDelivery(response, options = {}) {
  const now = new Date(options.now ?? new Date());
  const maxGapHours = Number(options.maxGapHours ?? 2);
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid diagnostic clock');
  if (!Number.isFinite(maxGapHours) || maxGapHours <= 0 || maxGapHours > 168) {
    throw new Error('Invalid schedule delivery threshold');
  }
  if (!response || !Array.isArray(response.workflow_runs)) {
    throw new Error('Invalid Actions workflow-run response');
  }

  const runs = response.workflow_runs.map(run => {
    if (!run || !['schedule', 'push', 'workflow_dispatch'].includes(run.event) ||
        typeof run.created_at !== 'string') {
      throw new Error('Unexpected Actions workflow run');
    }
    const timestamp = Date.parse(run.created_at);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime() + MAX_FUTURE_SKEW_MS) {
      throw new Error('Invalid Actions run timestamp');
    }
    return { id: run.id, event: run.event, createdAt: new Date(timestamp).toISOString(),
      status: run.status, conclusion: run.conclusion, timestamp };
  }).sort((a, b) => b.timestamp - a.timestamp);

  const latestSchedule = runs.find(run => run.event === 'schedule') || null;
  const latestSuccessfulCheck = runs.find(run => run.conclusion === 'success') || null;
  const gapHours = latestSchedule
    ? Math.max(0, (now.getTime() - latestSchedule.timestamp) / 3600000)
    : null;
  const deliveryOverdue = gapHours === null || gapHours > maxGapHours;
  let status = 'healthy';
  if (deliveryOverdue) status = 'schedule_delivery_gap';
  else if (latestSchedule.status === 'completed' && latestSchedule.conclusion !== 'success') {
    status = 'schedule_failed';
  } else if (latestSchedule.status !== 'completed') {
    status = 'schedule_in_progress';
  }

  const describe = run => run && ({
    id: run.id, event: run.event, createdAt: run.createdAt,
    status: run.status, conclusion: run.conclusion
  });
  return {
    status, maxGapHours, scheduleGapHours: gapHours === null ? null : Number(gapHours.toFixed(3)),
    lastScheduledRun: describe(latestSchedule),
    lastSuccessfulCheck: describe(latestSuccessfulCheck),
    // A successful no-op check still counts as a check, not a publication.
    snapshotPublicationTimeIsNotCheckTime: true
  };
}

function main(argv = process.argv) {
  if (argv.length !== 3) {
    throw new Error('Usage: node ci/check-run-delivery.js path/to/workflow-runs.json');
  }
  const data = JSON.parse(fs.readFileSync(argv[2], 'utf8'));
  const result = classifyScheduledDelivery(data, {
    maxGapHours: process.env.CHART_MAX_SCHEDULE_GAP_HOURS
  });
  console.log('SCHEDULE_DELIVERY ' + JSON.stringify(result));
  if (!['healthy', 'schedule_in_progress'].includes(result.status)) {
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error('SCHEDULE_DIAGNOSTIC_ERROR: ' + error.message);
    process.exitCode = 2;
  }
}

module.exports = { classifyScheduledDelivery, main };
