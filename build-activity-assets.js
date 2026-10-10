#!/usr/bin/env node
'use strict';

// One source read and a single, immutable data snapshot for every generated range.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { readGithubDailyCounts, readLocalGitDailyCounts, buildSeries, selectRange, createMeta } = require('./generate-commit-chart');
const { renderModernHtml, renderModernSvg } = require('./modern-renderer');

const ALLOWED_RANGES = [30, 90, 365];
const DEFAULTS = {
  source: 'github', username: '', repo: '.', branch: 'main', author: '',
  outDir: 'dist', title: 'GitHub contribution activity', defaultDays: 30,
  ranges: [30, 90, 365], layout: 'spacious', theme: 'github-compact',
  hideBorder: true, width: 0, height: 0
};
const hash = (content) => createHash('sha256').update(content).digest('hex');
function parseRanges(value) {
  const ranges = String(value).split(',').map((v) => Number(v.trim()));
  if (!ranges.length || ranges.some((n) => !ALLOWED_RANGES.includes(n)) || new Set(ranges).size !== ranges.length) {
    throw new Error('Ranges must be unique values from 30,90,365');
  }
  return ranges;
}
function cliArgs(argv) {
  const opts = { ...DEFAULTS, ranges: [...DEFAULTS.ranges] };
  const aliases = {
    '--source': 'source', '--username': 'username', '--repo': 'repo',
    '--branch': 'branch', '--author': 'author', '--out-dir': 'outDir',
    '--title': 'title', '--default-days': 'defaultDays', '--ranges': 'ranges',
    '--layout': 'layout', '--theme': 'theme', '--width': 'width', '--height': 'height'
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--hide-border') { opts.hideBorder = true; continue; }
    if (argv[i] === '--show-border') { opts.hideBorder = false; continue; }
    const name = aliases[argv[i]], next = argv[++i];
    if (!name || next == null || next.startsWith('--')) {
      throw new Error('Invalid batch builder option: ' + argv[i - 1]);
    }
    opts[name] = name === 'ranges' ? parseRanges(next) :
      ['defaultDays', 'width', 'height'].includes(name) ? Number(next) : next;
  }
  if (!['github', 'local'].includes(opts.source)) throw new Error('Unsupported source');
  if (opts.source === 'github' && !opts.username) throw new Error('Missing --username');
  if (!ALLOWED_RANGES.includes(opts.defaultDays)) throw new Error('Invalid --default-days');
  if (!['spacious', 'comfortable', 'compact'].includes(opts.layout)) throw new Error('Invalid layout');
  if (!['github-compact', 'github-light'].includes(opts.theme)) throw new Error('Invalid theme');
  if (!Number.isFinite(opts.width) || opts.width < 0 || (opts.width && (opts.width < 640 || opts.width > 2400))) {
    throw new Error('Invalid width');
  }
  if (!Number.isFinite(opts.height) || opts.height < 0 || (opts.height && (opts.height < 240 || opts.height > 1200))) {
    throw new Error('Invalid height');
  }
  return opts;
}

function createAssetBundle(sourceData, opts = {}) {
  const options = { ...DEFAULTS, ...opts };
  const data = buildSeries(sourceData.counts, sourceData.startDate, sourceData.endDate);
  if (sourceData.sourceDetails.type === 'github' && data.length !== 365) {
    throw new Error('Expected complete 365-day GitHub contribution data');
  }
  const meta = createMeta({ days: options.defaultDays }, sourceData, data);
  const renderOptions = {
    theme: options.theme, layout: options.layout, hideBorder: options.hideBorder,
    width: options.width || undefined, height: options.height || undefined
  };
  const assets = { 'index.html': renderModernHtml(options.title, '', meta, data, renderOptions) };
  const htmlPayload = assets['index.html'].match(/<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!htmlPayload) throw new Error('HTML is missing its embedded snapshot');
  const parsed = JSON.parse(htmlPayload[1]);
  if (parsed.meta?.snapshotId !== meta.snapshotId ||
    JSON.stringify(parsed.data) !== JSON.stringify(data)) throw new Error('HTML snapshot integrity failure');

  const ranges = {};
  for (const days of options.ranges) {
    const subset = selectRange(data, days);
    if (!subset.length) throw new Error('Empty requested chart range: ' + days);
    const total = subset.reduce((sum, p) => sum + p.commits, 0);
    const name = 'activity-' + days + 'd.svg';
    const svg = renderModernSvg(options.title, '', meta, data, days, renderOptions);
    if (!svg.startsWith('<svg ') || /<script\b|<foreignObject\b|NaN|Infinity|href\s*=\s*["']https?:/i.test(svg) ||
        !svg.includes(days + ' days · ' + total + ' contributions') ||
        !svg.includes('Snapshot ' + meta.snapshotId.slice(0, 10))) {
      throw new Error('SVG validation failed for ' + name);
    }
    assets[name] = svg;
    ranges[days] = { total, startDate: subset[0].date, endDate: subset.at(-1).date };
  }
  const records = Object.fromEntries(Object.entries(assets).map(([name, value]) =>
    [name, { bytes: Buffer.byteLength(value), sha256: hash(value) }]));
  const manifest = {
    schemaVersion: 1, snapshotId: meta.snapshotId,
    publicDataPolicy: 'daily-aggregates-only-v1',
    generatedAt: meta.generatedAt, source: meta.source,
    username: meta.username, sourceCommit: process.env.GITHUB_SHA || null,
    workflowRun: process.env.GITHUB_RUN_ID || null,
    calendarDays: data.length, rangeStart: data[0].date,
    rangeEnd: data.at(-1).date, currentDayPartial: true,
    ranges, assets: records
  };
  assets['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  assets['.nojekyll'] = '';
  return { assets, manifest, meta };
}

function writeBundle(outDir, assets) {
  const destination = path.resolve(outDir);
  if (fs.existsSync(destination)) throw new Error('Refusing to replace existing output directory: ' + destination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const staging = fs.mkdtempSync(path.join(path.dirname(destination), '.deus-chart-build-'));
  try {
    for (const [name, content] of Object.entries(assets)) {
      if (name.includes('/') || name.includes('..')) throw new Error('Unsafe asset name');
      fs.writeFileSync(path.join(staging, name), content, 'utf8');
    }
    fs.renameSync(staging, destination);
  } finally {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  }
}

async function main() {
  const opts = cliArgs(process.argv);
  const asOf = new Date();
  const sourceData = opts.source === 'github'
    ? await readGithubDailyCounts(opts.username, asOf)
    : readLocalGitDailyCounts(path.resolve(opts.repo), opts.branch, opts.author, asOf);
  const { assets, manifest } = createAssetBundle(sourceData, opts);
  writeBundle(opts.outDir, assets);
  console.log('Validated ' + Object.keys(manifest.assets).join(', ') +
    '; snapshot=' + manifest.snapshotId + '; out=' + opts.outDir);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseRanges, cliArgs, createAssetBundle, writeBundle };
