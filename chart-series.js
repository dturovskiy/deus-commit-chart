'use strict';

// Pure contribution-calendar series and public metadata. This core module is
// shared by the CLI and the validated bundle builder; it never invokes a CLI.
const { trailingMean7 } = require('./activity-metrics');
const { snapshotIdentity } = require('./contribution-snapshot');

function isoToUtcDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function utcDateToIso(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildSeries(counts, startDate, endDate) {
  const start = isoToUtcDate(startDate);
  const end = isoToUtcDate(endDate);
  if (!start || !end || start > end) throw new Error('Invalid activity date range.');

  const series = [];
  let cumulative = 0;

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = utcDateToIso(cursor);
    const commits = counts.get(date) || 0;
    cumulative += commits;

    const previousSix = series.slice(Math.max(0, series.length - 6)).map((point) => point.commits);
    const ma7 = trailingMean7(previousSix.concat(commits));

    series.push({
      date,
      commits,
      cumulative,
      ma7
    });
  }

  return series;
}

function createMeta(args, sourceData, series) {
  const activeDays = series.filter((point) => point.commits > 0).length;
  return {
    source: sourceData.sourceDetails.type,
    repo: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.repo || null : null,
    branch: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.branch || null : null,
    author: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.author || null : null,
    username: sourceData.sourceDetails.type === 'github' ? sourceData.sourceDetails.username || null : null,
    schemaVersion: 1,
    snapshotId: snapshotIdentity(sourceData, series),
    currentDayPartial: true,
    generatedAt: sourceData.asOf || new Date().toISOString(),
    totalCommits: series.at(-1)?.cumulative || 0,
    activeDays,
    calendarDays: series.length,
    startDate: series[0]?.date || null,
    endDate: series.at(-1)?.date || null,
    defaultDays: args.days
  };
}

module.exports = { buildSeries, createMeta, isoToUtcDate };
