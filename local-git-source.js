'use strict';

// Offline local-Git source adapter. Never contacts GitHub or reads API tokens.
// Commit instants are assigned to UTC days, independent of author/runner TZ.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { utcWindow } = require('./contribution-snapshot');

const GIT_TIMEOUT_MS = 20000;
const GIT_MAX_BUFFER = 16 * 1024 * 1024;

function readLocalGitDailyCounts(repo, branch, author = '', asOf = new Date(), options = {}) {
  if (typeof repo !== 'string' || !repo.trim()) throw new Error('Local source requires a repository path');
  if (typeof branch !== 'string' || !branch.trim() || branch.startsWith('-')) {
    throw new Error('Invalid local Git branch/ref');
  }
  if (typeof author !== 'string') throw new Error('Invalid local Git author filter');
  const window = utcWindow(asOf);
  const args = ['-C', path.resolve(repo), 'log', '--format=%aI'];
  if (author) args.push('--author=' + author);
  args.push(branch);
  const runner = options.spawnSyncImpl || spawnSync;
  const result = runner('git', args, {
    encoding: 'utf8',
    timeout: options.timeoutMs || GIT_TIMEOUT_MS,
    maxBuffer: options.maxBuffer || GIT_MAX_BUFFER,
    windowsHide: true
  });
  if (result.error) throw new Error('Local git log failed: ' + result.error.message);
  if (result.status !== 0) throw new Error((result.stderr || 'Local git log failed').trim());
  if (typeof result.stdout !== 'string') throw new Error('Local git log returned invalid text');

  const counts = new Map();
  let commitsSeen = 0;
  for (const raw of result.stdout.split(/\r?\n/)) {
    const stamp = raw.trim();
    if (!stamp) continue;
    // Git log output format %aI is strict ISO 8601 with a numeric timezone offset.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(stamp)) {
      throw new Error('Invalid Git author timestamp returned by git log');
    }
    const instant = new Date(stamp);
    if (!Number.isFinite(instant.getTime())) {
      throw new Error('Invalid Git author timestamp returned by git log');
    }
    commitsSeen++;
    const date = instant.toISOString().slice(0, 10);
    if (date < window.startDate || date > window.endDate) continue;
    const next = (counts.get(date) || 0) + 1;
    if (!Number.isSafeInteger(next)) throw new Error('Local commit count exceeds safe integer range');
    counts.set(date, next);
  }
  if (!commitsSeen) throw new Error('No commits found for the selected ref/author.');
  return {
    counts, startDate: window.startDate, endDate: window.endDate,
    asOf: new Date(asOf).toISOString(),
    sourceDetails: {
      type: 'local',
      repo: path.basename(path.resolve(repo)),
      branch, author: author || null
    }
  };
}

module.exports = { readLocalGitDailyCounts, GIT_TIMEOUT_MS, GIT_MAX_BUFFER };
