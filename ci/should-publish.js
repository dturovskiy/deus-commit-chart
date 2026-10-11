#!/usr/bin/env node
'use strict';

// A chart refresh can observe exactly the same 365-day data as last time.
// Skip the Git commit only when the previously deployed assets are VERIFIED,
// the data snapshot is identical, and the generator source commit is identical.
// Never skip because two raw SVGs happen to contain similar text.
const { verifyDirectory } = require('../verify-activity-assets');

function canReusePublishedSnapshot(previousDir, candidateDir) {
  // A broken candidate is a hard failure. Do not hide it behind a matching ID.
  const candidate = verifyDirectory(candidateDir);
  let previous;
  try {
    previous = verifyDirectory(previousDir);
  } catch (error) {
    // An old/invalid publication must be repaired by a fresh validated build.
    return { reuse: false, reason: 'previous-invalid: ' + error.message };
  }
  if (!candidate.sourceCommit || !previous.sourceCommit ||
      !/^[a-f0-9]{40}$/.test(candidate.sourceCommit) ||
      !/^[a-f0-9]{40}$/.test(previous.sourceCommit)) {
    return { reuse: false, reason: 'unknown-source-revision' };
  }
  for (const key of ['schemaVersion', 'publicDataPolicy', 'source',
    'username', 'sourceCommit', 'snapshotId', 'rangeStart', 'rangeEnd',
    'calendarDays']) {
    if (candidate[key] !== previous[key]) return { reuse: false, reason: key + '-changed' };
  }
  if (JSON.stringify(candidate.ranges) !== JSON.stringify(previous.ranges)) {
    return { reuse: false, reason: 'ranges-changed' };
  }
  return { reuse: true, reason: 'same-validated-data-and-generator-revision' };
}

function main() {
  if (process.argv.length !== 4) {
    throw new Error('Usage: node ci/should-publish.js PREVIOUS_DIR CANDIDATE_DIR');
  }
  const result = canReusePublishedSnapshot(process.argv[2], process.argv[3]);
  console.log(JSON.stringify(result));
  // 0 = no new Git commit needed; 1 = produce a new verified publication.
  process.exitCode = result.reuse ? 0 : 1;
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('PUBLISH_DECISION_ERROR: ' + error.message);
    process.exitCode = 2;
  }
}

module.exports = { canReusePublishedSnapshot };
