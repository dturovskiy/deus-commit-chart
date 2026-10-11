#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  LAYOUT_PRESETS,
  THEMES,
  selectRange: rendererSelectRange,
  renderModernSvg,
  renderModernHtml
} = require('./modern-renderer');

const { trailingMean7 } = require('./activity-metrics');
const RANGE_OPTIONS = [30, 90, 365];
// Themes and layout presets are owned by the renderer (one source of truth).

function parseArgs(argv) {
  const out = {
    source: 'local',
    repo: '.',
    branch: 'main',
    out: 'commit-chart.html',
    author: '',
    username: '',
    title: 'Commit activity',
    description: '',
    format: '',
    days: 90,
    theme: 'github-compact',
    layout: 'comfortable',
    width: 0,
    height: 0,
    hideBorder: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--repo') { out.repo = requiredValue(arg, next); i++; }
    else if (arg === '--branch') { out.branch = requiredValue(arg, next); i++; }
    else if (arg === '--out') { out.out = requiredValue(arg, next); i++; }
    else if (arg === '--author') { out.author = requiredValue(arg, next); i++; }
    else if (arg === '--username') { out.username = requiredValue(arg, next); i++; }
    else if (arg === '--title') { out.title = requiredValue(arg, next); i++; }
    else if (arg === '--description') { out.description = requiredValue(arg, next); i++; }
    else if (arg === '--source') { out.source = requiredValue(arg, next); i++; }
    else if (arg === '--format') { out.format = requiredValue(arg, next); i++; }
    else if (arg === '--days') { out.days = Number(requiredValue(arg, next)); i++; }
    else if (arg === '--theme') { out.theme = requiredValue(arg, next); i++; }
    else if (arg === '--layout') { out.layout = requiredValue(arg, next); i++; }
    else if (arg === '--width') { out.width = Number(requiredValue(arg, next)); i++; }
    else if (arg === '--height') { out.height = Number(requiredValue(arg, next)); i++; }
    else if (arg === '--hide-border') { out.hideBorder = true; }
    else if (arg === '--help' || arg === '-h') usage(0);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out.format) {
    out.format = path.extname(out.out).toLowerCase() === '.svg' ? 'svg' : 'html';
  }

  if (!['local', 'github'].includes(out.source)) {
    throw new Error('--source must be one of: local, github');
  }
  if (!['html', 'svg'].includes(out.format)) {
    throw new Error('--format must be one of: html, svg');
  }
  if (!RANGE_OPTIONS.includes(out.days)) {
    throw new Error(`--days must be one of: ${RANGE_OPTIONS.join(', ')}`);
  }
  if (!THEMES[out.theme]) {
    throw new Error(`--theme must be one of: ${Object.keys(THEMES).join(', ')}`);
  }
  if (!LAYOUT_PRESETS[out.layout]) {
    throw new Error(`--layout must be one of: ${Object.keys(LAYOUT_PRESETS).join(', ')}`);
  }
  if (out.width && (!Number.isFinite(out.width) || out.width < 640 || out.width > 2400)) {
    throw new Error('--width must be between 640 and 2400');
  }
  if (out.height && (!Number.isFinite(out.height) || out.height < 240 || out.height > 1200)) {
    throw new Error('--height must be between 240 and 1200');
  }
  if (out.source === 'github' && !out.username) {
    throw new Error('--username is required when --source github is used');
  }

  return out;
}

function requiredValue(arg, value) {
  if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
  return value;
}

function usage(code) {
  console.log(`Usage:
  node generate-commit-chart.js --repo /path/to/repo --out commit-chart.html
  GITHUB_TOKEN=... node generate-commit-chart.js --source github --username octocat --format svg --days 90 --out activity.svg

Options:
  --source        Data source: local (default) or github
  --repo          Path to local Git clone (local source)
  --branch        Branch/ref to read, default: main
  --author        Optional git author filter
  --username      GitHub login (required for github source)
  --format        html or svg; inferred from --out extension when omitted
  --days          Default/display range: 30, 90, or 365 (default: 90)
  --theme         SVG theme: github-compact or github-light
  --layout        Chart spacing preset: compact, comfortable, or spacious
  --width         Optional SVG/interactive chart width (640-2400)
  --height        Optional SVG/interactive chart height (240-1200)
  --hide-border   Hide the outer border in SVG output
  --title         Chart title
  --description   Optional short subtitle
  --out           Output HTML or SVG file

GitHub source authentication:
  Set GITHUB_TOKEN, GH_TOKEN, or DEUS_COMMIT_CHART_GITHUB_TOKEN in the environment.
  Tokens are intentionally not accepted as CLI arguments.`);
  process.exit(code);
}

// Both source adapters share a frozen asOf and normalized data envelope.
const { readLocalGitDailyCounts, loadContributionSource } = require('./source-adapters');
async function readGithubDailyCounts(username, asOf = new Date()) {
  return loadContributionSource({ source: 'github', username }, { asOf });
}

function isoToUtcDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function utcDateToIso(date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

// Range selection is shared with both modern SVG and embedded HTML renderers.
const selectRange = rendererSelectRange;

function createMeta(args, sourceData, series) {
  const activeDays = series.filter((point) => point.commits > 0).length;
  return {
    source: sourceData.sourceDetails.type,
    repo: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.repo || null : null,
    branch: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.branch || null : null,
    author: sourceData.sourceDetails.type === 'local' ? sourceData.sourceDetails.author || null : null,
    username: sourceData.sourceDetails.type === 'github' ? sourceData.sourceDetails.username || null : null,
    schemaVersion: 1,
    snapshotId: require('./contribution-snapshot').snapshotIdentity(sourceData, series),
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

// HTML and SVG are rendered by modern-renderer.js. Legacy copies removed.

function svgDate(iso, includeYear) {
  const date = isoToUtcDate(iso);
  if (!date) return iso;
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date);
  const day = String(date.getUTCDate()).padStart(2, '0');
  return includeYear ? `${month} ${day}, ${date.getUTCFullYear()}` : `${month} ${day}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const asOf = new Date();
  const sourceData = await loadContributionSource(args, { asOf });

  const series = buildSeries(sourceData.counts, sourceData.startDate, sourceData.endDate);
  const meta = createMeta(args, sourceData, series);
  const renderOptions = {
    theme: args.theme,
    layout: args.layout,
    width: args.width || undefined,
    height: args.height || undefined,
    hideBorder: args.hideBorder
  };
  const output = args.format === 'svg'
    ? renderModernSvg(args.title, args.description, meta, series, args.days, renderOptions)
    : renderModernHtml(args.title, args.description, meta, series, renderOptions);

  const outputPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');

  const visible = selectRange(series, args.days);
  const visibleTotal = visible.reduce((sum, point) => sum + point.commits, 0);
  console.log(`Wrote ${outputPath}`);
  console.log(`${visibleTotal} activities across ${visible.filter((point) => point.commits > 0).length} active days / ${visible.length} calendar days (${args.days}d view)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildSeries,
  selectRange,
  readGithubDailyCounts,
  readLocalGitDailyCounts,
  createMeta,
  renderSvg: renderModernSvg,
  renderHtml: renderModernHtml,
  svgDate
};
