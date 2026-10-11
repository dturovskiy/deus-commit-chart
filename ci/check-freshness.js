#!/usr/bin/env node
'use strict';

// Read-only freshness gate for the *published* branch, not the source checkout.
// A stale or missing manifest fails CI and activates the issue-notification step.
const fs = require('node:fs');

const DEFAULT_MAX_AGE_HOURS = 8;
const MAX_FUTURE_SKEW_MINUTES = 10;
function checkFreshness(manifest, options = {}) {
  const now = new Date(options.now ?? new Date());
  const maxAgeHours = Number(options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS);
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid monitoring clock');
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0 || maxAgeHours > 168) {
    throw new Error('Invalid freshness threshold');
  }
  if (manifest?.schemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(manifest?.snapshotId || '') ||
      !/^\d{4}-\d{2}-\d{2}T/.test(manifest?.generatedAt || '')) {
    throw new Error('Missing or invalid published snapshot metadata');
  }
  const generatedAt = new Date(manifest.generatedAt);
  if (!Number.isFinite(generatedAt.getTime())) throw new Error('Invalid generatedAt timestamp');
  const deltaMs = now.getTime() - generatedAt.getTime();
  if (deltaMs < -MAX_FUTURE_SKEW_MINUTES * 60000) {
    throw new Error('Published snapshot is in the future; check clock skew');
  }
  // Validate structural integrity before checking the snapshot age. This keeps
  // malformed metadata distinguishable from a genuinely stale valid release.
  const manifestRanges = manifest.ranges || {};
  if (![30, 90, 365].every(days =>
    Number.isSafeInteger(manifestRanges[days]?.total) && manifestRanges[days].total >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(manifestRanges[days]?.endDate || ''))) {
    throw new Error('Published snapshot is missing required range metadata');
  }
  if (manifest.calendarDays !== 365 || manifest.rangeEnd !== manifestRanges[365].endDate) {
    throw new Error('Published snapshot has inconsistent calendar coverage');
  }
  if (deltaMs > maxAgeHours * 3600000) {
    throw new Error('Published chart is stale: age=' + (deltaMs / 3600000).toFixed(2) +
      'h, threshold=' + maxAgeHours + 'h');
  }
  return {
    status: 'healthy', snapshotId: manifest.snapshotId,
    generatedAt: generatedAt.toISOString(),
    ageHours: Math.max(0, deltaMs / 3600000),
    thresholdHours: maxAgeHours,
    sourceCommit: manifest.sourceCommit || null,
    workflowRun: manifest.workflowRun || null
  };
}

function main(argv = process.argv) {
  if (argv.length !== 3) {
    throw new Error('Usage: node ci/check-freshness.js path/to/published/manifest.json');
  }
  const manifest = JSON.parse(fs.readFileSync(argv[2], 'utf8'));
  const report = checkFreshness(manifest, { maxAgeHours: process.env.CHART_MAX_AGE_HOURS });
  console.log('Chart freshness OK ' + JSON.stringify(report));
  return report;
}
if (require.main === module) {
  try { main(); } catch (error) {
    console.error('CHART_FRESHNESS_FAILURE: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { checkFreshness, main, DEFAULT_MAX_AGE_HOURS };
