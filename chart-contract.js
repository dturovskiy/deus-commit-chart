'use strict';

// A deterministic public chart contract shared by builders and independent release checks.
// Reject invalid/corrupt series instead of silently substituting zeros in the renderer.
const { parseIsoDay, snapshotIdentity } = require('./contribution-snapshot');
const DAY_MS = 86400000;
const SCHEMA_VERSION = 1;

function validateContributionSeries(data, meta, options = {}) {
  if (!Array.isArray(data) || data.length !== 365) throw new Error('Chart contract requires exactly 365 days');
  if (!meta || meta.schemaVersion !== SCHEMA_VERSION ||
      !['github', 'local'].includes(meta.source) ||
      !/^[a-f0-9]{64}$/.test(meta.snapshotId || '')) {
    throw new Error('Invalid chart schema/identity metadata');
  }
  if (!Number.isFinite(Date.parse(meta.generatedAt))) throw new Error('Invalid chart generatedAt');
  const firstMs = parseIsoDay(data[0]?.date);
  const expectedEnd = new Date(firstMs + 364 * DAY_MS).toISOString().slice(0, 10);
  if (meta.startDate !== data[0].date || meta.endDate !== data.at(-1).date ||
      data.at(-1).date !== expectedEnd || meta.calendarDays !== 365) {
    throw new Error('Chart date range metadata mismatch');
  }
  const publicationDay = meta.generatedAt.slice(0, 10);
  if (options.checkCurrentDay !== false && meta.endDate !== publicationDay) {
    throw new Error('Chart must end on the UTC date of generation');
  }
  if (typeof meta.currentDayPartial !== 'boolean') {
    throw new Error('Chart current-day flag must be boolean');
  }
  let cumulative = 0, active = 0;
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const expectedDate = new Date(firstMs + i * DAY_MS).toISOString().slice(0, 10);
    if (!point || point.date !== expectedDate || !Number.isSafeInteger(point.commits) || point.commits < 0) {
      throw new Error('Invalid daily contribution datum at offset ' + i);
    }
    cumulative += point.commits;
    if (!Number.isSafeInteger(cumulative)) throw new Error('Cumulative contributions exceed safe integer range');
    if (point.commits > 0) active++;
    if (point.cumulative !== cumulative) throw new Error('Incorrect cumulative contribution count at ' + point.date);
    const previous = data.slice(Math.max(0, i - 6), i + 1);
    const sum = previous.reduce((n, p) => n + p.commits, 0);
    const mean = Number((sum / previous.length).toFixed(2));
    if (!Number.isFinite(point.ma7) || point.ma7 !== mean) {
      throw new Error('Incorrect seven-day moving average at ' + point.date);
    }
  }
  if (meta.totalCommits !== cumulative || meta.activeDays !== active) {
    throw new Error('Chart summary totals do not match daily contributions');
  }
  const identity = snapshotIdentity({
    sourceDetails: {type: meta.source, username: meta.username || null},
    startDate: meta.startDate, endDate: meta.endDate
  }, data);
  if (identity !== meta.snapshotId) throw new Error('Chart snapshot hash does not match daily series');
  return { total: cumulative, activeDays: active, firstDate: data[0].date,
    lastDate: data.at(-1).date, snapshotId: identity };
}

module.exports = { validateContributionSeries, SCHEMA_VERSION };
