'use strict';

// Internal, versioned canonical contribution envelope. This is NOT a change to
// the public HTML/SVG/manifest schema nor the Marketplace Action inputs.
const { parseIsoDay, snapshotIdentity } = require('./contribution-snapshot');

const SNAPSHOT_SCHEMA_VERSION = 1;
const DAYS = 365;
const DAY_MS = 86400000;
const HASH = /^[a-f0-9]{64}$/;

function createContributionSnapshot(raw) {
  if (!raw || !(raw.counts instanceof Map) || !raw.sourceDetails ||
      !['github', 'local'].includes(raw.sourceDetails.type)) {
    throw new Error('ContributionSnapshot requires a known source and daily count Map');
  }
  const asOf = new Date(raw.asOf);
  if (typeof raw.asOf !== 'string' ||
      !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$/.test(raw.asOf) ||
      !Number.isFinite(asOf.getTime()) ||
      asOf.toISOString().slice(0, 19) !== raw.asOf.slice(0, 19)) {
    throw new Error('ContributionSnapshot requires a valid UTC ISO asOf timestamp');
  }
  const startMs = parseIsoDay(raw.startDate);
  const endMs = parseIsoDay(raw.endDate);
  if (endMs - startMs !== (DAYS - 1) * DAY_MS ||
      raw.endDate !== raw.asOf.slice(0, 10)) {
    throw new Error('ContributionSnapshot requires the trailing 365 UTC days');
  }
  const source = raw.sourceDetails.type === 'github'
    ? { type: 'github', username: raw.sourceDetails.username }
    : { type: 'local', repo: raw.sourceDetails.repo || null,
        branch: raw.sourceDetails.branch || null, author: raw.sourceDetails.author || null };
  if (source.type === 'github' && (!/^[A-Za-z0-9-]{1,39}$/.test(source.username || '') ||
      raw.counts.size !== DAYS)) {
    throw new Error('ContributionSnapshot GitHub source must provide all 365 days');
  }
  for (const key of ['repo','branch','author']) {
    if (key in source && source[key] != null && typeof source[key] !== 'string') {
      throw new Error('ContributionSnapshot invalid local source label');
    }
  }
  for (const [date, value] of raw.counts) {
    const ms = parseIsoDay(date);
    if (ms < startMs || ms > endMs || !Number.isSafeInteger(value) || value < 0) {
      throw new Error('ContributionSnapshot invalid or out-of-range daily count');
    }
  }
  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(startMs + i * DAY_MS).toISOString().slice(0,10);
    if (source.type === 'github' && !raw.counts.has(date)) {
      throw new Error('ContributionSnapshot missing GitHub day: ' + date);
    }
    days.push(Object.freeze({ date, contributions: raw.counts.get(date) ?? 0 }));
  }
  const snapshotId = snapshotIdentity({
    sourceDetails: source,
    startDate: raw.startDate, endDate: raw.endDate
  }, days.map((day) => ({ date: day.date, commits: day.contributions })));
  const quality = Object.freeze({
    complete: true, expectedDays: DAYS, observedDays: DAYS,
    missingDays: 0, currentDayPartial: true,
    localZeroDaysInferred: source.type === 'local'
  });
  return Object.freeze({
    schemaVersion: SNAPSHOT_SCHEMA_VERSION, snapshotId,
    asOf: raw.asOf, source: Object.freeze(source),
    calendar: Object.freeze({ startDate: raw.startDate, endDate: raw.endDate, days: DAYS }),
    quality, days: Object.freeze(days)
  });
}

function validateContributionSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION ||
      !HASH.test(snapshot.snapshotId || '') ||
      !Array.isArray(snapshot.days) || snapshot.days.length !== DAYS ||
      !snapshot.source || !snapshot.calendar || !snapshot.quality) {
    throw new Error('Invalid ContributionSnapshot schema');
  }
  const counts = new Map();
  for (const day of snapshot.days) {
    if (!day || counts.has(day.date)) throw new Error('Duplicate/invalid ContributionSnapshot day');
    counts.set(day.date, day.contributions);
  }
  const restored = createContributionSnapshot({
    counts, asOf: snapshot.asOf,
    startDate: snapshot.calendar.startDate, endDate: snapshot.calendar.endDate,
    sourceDetails: snapshot.source
  });
  if (restored.snapshotId !== snapshot.snapshotId ||
      JSON.stringify(restored) !== JSON.stringify(snapshot)) {
    throw new Error('ContributionSnapshot identity, quality or schema mismatch');
  }
  return restored;
}

function snapshotToSourceData(snapshot) {
  const current = validateContributionSnapshot(snapshot);
  return {
    counts: new Map(current.days.map((day) => [day.date, day.contributions])),
    asOf: current.asOf,
    startDate: current.calendar.startDate, endDate: current.calendar.endDate,
    sourceDetails: { ...current.source }
  };
}

module.exports = {
  SNAPSHOT_SCHEMA_VERSION, createContributionSnapshot,
  validateContributionSnapshot, snapshotToSourceData
};
