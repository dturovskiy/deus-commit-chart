#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  LAYOUT_PRESETS,
  renderModernSvg,
  renderModernHtml
} = require('./modern-renderer');

const RANGE_OPTIONS = [30, 90, 365];
const SVG_THEMES = {
  'github-compact': {
    background: '#0d1117',
    panel: '#0d1117',
    border: '#30363d',
    grid: '#21262d',
    text: '#c9d1d9',
    muted: '#8b949e',
    line: '#39d353',
    area: 'rgba(57, 211, 83, 0.16)',
    average: '#58a6ff'
  },
  'github-light': {
    background: '#ffffff',
    panel: '#ffffff',
    border: '#d0d7de',
    grid: '#d8dee4',
    text: '#24292f',
    muted: '#57606a',
    line: '#1a7f37',
    area: 'rgba(26, 127, 55, 0.12)',
    average: '#0969da'
  }
};

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
  if (!SVG_THEMES[out.theme]) {
    throw new Error(`--theme must be one of: ${Object.keys(SVG_THEMES).join(', ')}`);
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

function readLocalGitDailyCounts(repo, branch, author, asOf = new Date()) {
  // Parse commit author instants and bucket in UTC, independent of the
  // author's embedded timezone or the runner's local TZ setting.
  const args = ['-C', repo, 'log', '--format=%aI'];
  if (author) args.push(`--author=${author}`);
  args.push(branch);

  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || 'git log failed').trim());

  const counts = new Map();
  for (const value of result.stdout.split(/\r?\n/)) {
    const stamp = value.trim();
    if (!stamp) continue;
    const instant = new Date(stamp);
    if (!Number.isFinite(instant.getTime())) {
      throw new Error('Invalid Git author timestamp returned by git log');
    }
    const date = instant.toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) || 0) + 1);
  }

  if (!counts.size) throw new Error('No commits found for the selected ref/author.');

  const dates = Array.from(counts.keys()).sort();
  const todayDate = startOfUtcDay(asOf);
  const today = utcDateToIso(todayDate);
  const trailingYearStart = utcDateToIso(addDays(todayDate, -364));
  // Future-dated commits must not extend the displayed calendar.
  for (const date of dates) if (date > today) counts.delete(date);
  return {
    counts,
    startDate: trailingYearStart,
    endDate: today,
    asOf: new Date(asOf).toISOString(),
    sourceDetails: {
      type: 'local',
      repo: path.basename(path.resolve(repo)),
      branch,
      author: author || null
    }
  };
}

async function readGithubDailyCounts(username, asOf = new Date()) {
  return require('./contribution-snapshot').fetchGithubDailyCounts(username, { asOf });
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
    const values = previousSix.concat(commits);
    const ma7 = values.reduce((sum, value) => sum + value, 0) / values.length;

    series.push({
      date,
      commits,
      cumulative,
      ma7: Number(ma7.toFixed(2))
    });
  }

  return series;
}

function selectRange(data, days) {
  if (!data.length) return [];
  const end = isoToUtcDate(data.at(-1).date);
  const start = addDays(end, -(days - 1));
  const startIso = utcDateToIso(start);
  let cumulative = 0;

  return data
    .filter((point) => point.date >= startIso)
    .map((point) => {
      cumulative += point.commits;
      return { ...point, cumulative };
    });
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
  const sourceData = args.source === 'github'
    ? await readGithubDailyCounts(args.username, asOf)
    : readLocalGitDailyCounts(path.resolve(args.repo), args.branch, args.author, asOf);

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
