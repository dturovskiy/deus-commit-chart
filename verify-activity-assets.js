#!/usr/bin/env node
'use strict';

// Independent integrity gate; run again after CI artifact download, before GitHub push.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { selectRange } = require('./generate-commit-chart');
const { validateContributionSeries } = require('./chart-contract');

function verifyDirectory(dir) {
  const root = path.resolve(dir);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.snapshotId) ||
      !Number.isFinite(Date.parse(manifest.generatedAt))) throw new Error('Invalid build manifest');
  const expectedNames = Object.keys(manifest.assets || {});
  const allowedFiles = new Set([...expectedNames, 'manifest.json', '.nojekyll']);
  const actualFiles = fs.readdirSync(root, { withFileTypes: true });
  if (actualFiles.some((entry) => !entry.isFile() || !allowedFiles.has(entry.name)) ||
      actualFiles.length !== allowedFiles.size) throw new Error('Unexpected or missing build artifact');
  if (!expectedNames.includes('index.html') || !expectedNames.some((name) => name.endsWith('.svg'))) {
    throw new Error('Missing expected chart assets');
  }
  for (const name of expectedNames) {
    if (!/^(index\.html|activity-(30|90|365)d\.svg)$/.test(name)) throw new Error('Unexpected manifest asset: ' + name);
    const content = fs.readFileSync(path.join(root, name));
    const actualHash = createHash('sha256').update(content).digest('hex');
    if (manifest.assets[name].sha256 !== actualHash || manifest.assets[name].bytes !== content.length) {
      throw new Error('Asset checksum mismatch: ' + name);
    }
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing HTML data');
  const payload = JSON.parse(match[1]);
  // Public artifacts intentionally contain daily aggregates, not GitHub's
  // restricted/private contribution breakdown or arbitrary source metadata.
  const allowedTopLevel = new Set(['title', 'description', 'meta', 'data', 'theme', 'layout']);
  const allowedMetadata = new Set([
    'source', 'repo', 'branch', 'author', 'username',
    'schemaVersion', 'snapshotId', 'currentDayPartial', 'generatedAt',
    'totalCommits', 'activeDays', 'calendarDays', 'startDate', 'endDate', 'defaultDays'
  ]);
  if (Object.keys(payload).some((key) => !allowedTopLevel.has(key)) ||
      !payload.meta || Object.keys(payload.meta).some((key) => !allowedMetadata.has(key))) {
    throw new Error('Unexpected public chart payload metadata');
  }
  if (payload.meta.source === 'github' && [payload.meta.repo, payload.meta.branch, payload.meta.author].some((v) => v != null)) {
    throw new Error('Private source fields must not appear in public GitHub chart metadata');
  }
  if (!['github', 'local'].includes(payload.meta.source)) {
    throw new Error('Unexpected chart source');
  }
  validateContributionSeries(payload.data, payload.meta);
  if (payload.meta.snapshotId !== manifest.snapshotId ||
      payload.meta.generatedAt !== manifest.generatedAt ||
      payload.data[0]?.date !== manifest.rangeStart ||
      payload.data.at(-1)?.date !== manifest.rangeEnd ||
      payload.data.length !== manifest.calendarDays) throw new Error('HTML/manifest mismatch');
  for (const [days, range] of Object.entries(manifest.ranges)) {
    const data = selectRange(payload.data, Number(days));
    const total = data.reduce((sum, p) => sum + p.commits, 0);
    const svg = fs.readFileSync(path.join(root, 'activity-' + days + 'd.svg'), 'utf8');
    if (total !== range.total || data[0]?.date !== range.startDate ||
      data.at(-1)?.date !== range.endDate ||
      !svg.startsWith('<svg ') || !svg.includes(days + ' days · ' + total + ' contributions') ||
      !svg.includes('Snapshot ' + manifest.snapshotId.slice(0, 10)) ||
      /<script\b|<foreignObject\b|NaN|Infinity|href\s*=\s*["']https?:/i.test(svg)) {
      throw new Error('SVG numerical/integrity failure: ' + days + 'd');
    }
  }
  return manifest;
}

if (require.main === module) {
  try {
    const result = verifyDirectory(process.argv[2] || 'dist');
    console.log('Verified snapshot=' + result.snapshotId + ', assets=' + Object.keys(result.assets).length);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { verifyDirectory };
