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

function readLocalGitDailyCounts(repo, branch, author) {
  const args = ['-C', repo, 'log', '--date=short', '--format=%ad'];
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
    const date = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    counts.set(date, (counts.get(date) || 0) + 1);
  }

  if (!counts.size) throw new Error('No commits found for the selected ref/author.');

  const dates = Array.from(counts.keys()).sort();
  const todayDate = startOfUtcDay(new Date());
  const today = utcDateToIso(todayDate);
  const trailingYearStart = utcDateToIso(addDays(todayDate, -364));
  const lastDate = dates.at(-1);
  return {
    counts,
    startDate: dates[0] < trailingYearStart ? dates[0] : trailingYearStart,
    endDate: lastDate > today ? lastDate : today,
    sourceDetails: {
      type: 'local',
      repo: path.basename(path.resolve(repo)),
      branch,
      author: author || null
    }
  };
}

async function readGithubDailyCounts(username) {
  const token = process.env.DEUS_COMMIT_CHART_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GitHub source requires GITHUB_TOKEN, GH_TOKEN, or DEUS_COMMIT_CHART_GITHUB_TOKEN.');
  }

  const endDay = startOfUtcDay(new Date());
  const startDay = addDays(endDay, -364);
  const queryEnd = addDays(endDay, 1);
  const query = `
    query CommitChart($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          restrictedContributionsCount
          hasAnyRestrictedContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'deus-commit-chart'
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: startDay.toISOString(),
        to: queryEnd.toISOString()
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GraphQL request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${payload.errors.map((item) => item.message).join('; ')}`);
  }

  const collection = payload.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!calendar) throw new Error(`GitHub user not found or contribution data unavailable: ${username}`);

  const counts = new Map();
  for (const week of calendar.weeks || []) {
    for (const day of week.contributionDays || []) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
        counts.set(day.date, Number(day.contributionCount) || 0);
      }
    }
  }

  return {
    counts,
    startDate: utcDateToIso(startDay),
    endDate: utcDateToIso(endDay),
    sourceDetails: {
      type: 'github',
      username,
      totalContributions: Number(calendar.totalContributions) || 0,
      totalCommitContributions: Number(collection.totalCommitContributions) || 0,
      restrictedContributionsCount: Number(collection.restrictedContributionsCount) || 0,
      hasAnyRestrictedContributions: Boolean(collection.hasAnyRestrictedContributions)
    }
  };
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
    repo: sourceData.sourceDetails.repo || null,
    branch: sourceData.sourceDetails.branch || null,
    author: sourceData.sourceDetails.author || null,
    username: sourceData.sourceDetails.username || null,
    totalCommitContributions: sourceData.sourceDetails.totalCommitContributions ?? null,
    restrictedContributionsCount: sourceData.sourceDetails.restrictedContributionsCount ?? null,
    hasAnyRestrictedContributions: sourceData.sourceDetails.hasAnyRestrictedContributions ?? null,
    generatedAt: new Date().toISOString(),
    totalCommits: series.at(-1)?.cumulative || 0,
    activeDays,
    calendarDays: series.length,
    startDate: series[0]?.date || null,
    endDate: series.at(-1)?.date || null,
    defaultDays: args.days
  };
}

function renderHtml(title, description, meta, data) {
  const json = JSON.stringify({ title, description, meta, data }).replace(/</g, '\\u003c');
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description || 'Activity over calendar time with zero-activity days preserved, daily counts, a 7-day average, and a range switcher.');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050816;
      --surface: rgba(15, 23, 42, .80);
      --surface-2: rgba(2, 6, 23, .72);
      --line: rgba(148, 163, 184, .16);
      --line-strong: rgba(226, 232, 240, .24);
      --text: #e5edf7;
      --muted: #93a4b8;
      --muted-2: #64748b;
      --cyan: #22d3ee;
      --violet: #a78bfa;
      --green: #34d399;
      --slate: #475569;
      --shadow: 0 24px 90px rgba(0, 0, 0, .38);
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    button { font: inherit; }

    body {
      background:
        radial-gradient(circle at 12% -8%, rgba(34, 211, 238, .18), transparent 31rem),
        radial-gradient(circle at 82% 0%, rgba(167, 139, 250, .14), transparent 28rem),
        linear-gradient(180deg, #050816 0%, #07111f 48%, #020617 100%);
      color: var(--text);
      font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    main { width: min(1220px, calc(100vw - 36px)); margin: 0 auto; padding: 38px 0 44px; }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      color: var(--muted);
      font-size: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(15, 23, 42, .54);
      padding: 8px 11px;
      color: #bfefff;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .badge::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--green);
      box-shadow: 0 0 18px rgba(52, 211, 153, .75);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(360px, .8fr);
      gap: 18px;
      align-items: stretch;
      margin-bottom: 18px;
    }

    .intro, .stats, .chart-card, .note-card, .meta-card {
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    .intro {
      border-radius: 28px;
      padding: clamp(22px, 3vw, 34px);
      min-height: 238px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }

    .intro::after {
      content: "";
      position: absolute;
      inset: auto -12% -48% 38%;
      height: 260px;
      background: radial-gradient(circle, rgba(34, 211, 238, .18), transparent 62%);
      pointer-events: none;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: #67e8f9;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .18em;
    }

    h1 {
      margin: 0;
      max-width: 820px;
      font-size: clamp(34px, 5vw, 62px);
      line-height: .95;
      letter-spacing: -.06em;
    }

    .subtitle { margin: 18px 0 0; max-width: 760px; color: #b5c2d4; font-size: 15px; }

    .quick-read {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 24px;
      position: relative;
      z-index: 1;
    }

    .mini { border: 1px solid var(--line); border-radius: 18px; background: rgba(2, 6, 23, .42); padding: 13px 14px; }
    .mini strong { display: block; font-size: 13px; color: var(--text); }
    .mini span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }

    .stats { border-radius: 28px; padding: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .stat { border: 1px solid var(--line); border-radius: 20px; background: rgba(2, 6, 23, .48); padding: 15px 16px; min-height: 92px; }
    .stat span { display: flex; align-items: center; gap: 7px; color: var(--muted); font-size: 12px; line-height: 1.25; }
    .stat strong { display: block; margin-top: 8px; font-size: clamp(22px, 3vw, 30px); line-height: 1; letter-spacing: -.045em; color: #f8fafc; }
    .stat small { display: block; margin-top: 7px; color: var(--muted-2); font-size: 11px; }

    .chart-card { border-radius: 30px; padding: 18px; }
    .chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin: 0 2px 14px; }
    .chart-head h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
    .chart-head p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }

    .chart-actions { display: flex; align-items: center; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
    .range-switch { display: inline-flex; gap: 4px; border: 1px solid var(--line); border-radius: 999px; background: rgba(2, 6, 23, .52); padding: 4px; }
    .range-button { border: 0; border-radius: 999px; background: transparent; color: var(--muted); padding: 6px 10px; cursor: pointer; font-size: 12px; font-weight: 700; }
    .range-button:hover { color: var(--text); }
    .range-button[aria-pressed="true"] { background: rgba(34, 211, 238, .14); color: #bff7ff; box-shadow: inset 0 0 0 1px rgba(34, 211, 238, .26); }
    .range-button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

    .range-pill { white-space: nowrap; border: 1px solid var(--line); border-radius: 999px; padding: 8px 11px; background: rgba(2, 6, 23, .52); color: #cbd5e1; font-size: 12px; }
    .canvas-wrap { position: relative; border: 1px solid var(--line); border-radius: 24px; overflow: hidden; background: #020617; }
    canvas { width: 100%; height: auto; display: block; }

    .legend { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; color: var(--muted); font-size: 12px; margin: 14px 2px 0; }
    .legend span { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--line); border-radius: 999px; background: rgba(2, 6, 23, .36); padding: 7px 10px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .cyan { background: var(--cyan); box-shadow: 0 0 16px rgba(34, 211, 238, .65); }
    .violet { background: var(--violet); }
    .slate { background: var(--slate); }

    .below { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr); gap: 14px; margin-top: 14px; }
    .note-card, .meta-card { border-radius: 24px; padding: 18px; }
    .note-card h3, .meta-card h3 { margin: 0 0 10px; font-size: 15px; }
    .note-card ul { margin: 0; padding-left: 18px; color: #b8c4d6; }
    .note-card li { margin: 7px 0; }
    .meta-grid { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 7px 10px; color: var(--muted); font-size: 12px; }
    .meta-grid strong { color: #dbeafe; font-weight: 700; overflow-wrap: anywhere; }

    .tooltip {
      position: fixed;
      pointer-events: none;
      transform: translate(-50%, -114%);
      display: none;
      width: 220px;
      background: rgba(2, 6, 23, .96);
      border: 1px solid var(--line-strong);
      border-radius: 16px;
      padding: 12px 13px;
      box-shadow: 0 22px 70px rgba(0, 0, 0, .55);
      z-index: 10;
    }
    .tooltip strong { display: block; margin-bottom: 7px; font-size: 13px; }
    .tip-row { display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 12px; margin-top: 5px; }
    .tip-row b { color: var(--text); font-weight: 800; }

    @media (max-width: 900px) {
      main { width: min(100vw - 24px, 1220px); padding-top: 24px; }
      .hero, .below { grid-template-columns: 1fr; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .quick-read { grid-template-columns: 1fr; }
      .chart-head { display: block; }
      .chart-actions { justify-content: flex-start; margin-top: 12px; }
    }

    @media (max-width: 560px) {
      .stats { grid-template-columns: 1fr; }
      .topbar { display: block; }
      .badge { margin-bottom: 8px; }
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <div class="badge">Activity snapshot</div>
      <div id="generated-label">Generated locally</div>
    </div>

    <section class="hero">
      <div class="intro">
        <div>
          <p class="eyebrow">Deus Commit Chart</p>
          <h1>${safeTitle}</h1>
          <p class="subtitle">${safeDescription}</p>
        </div>
        <div class="quick-read">
          <div class="mini"><strong>30d</strong><span>Short-term development pulse and recent bursts.</span></div>
          <div class="mini"><strong>90d</strong><span>Quarter-scale trend with enough context for pauses and sustained work.</span></div>
          <div class="mini"><strong>365d</strong><span>Long-range activity view without leaving the report.</span></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><span>Activity count</span><strong id="s-total">—</strong><small>In the selected time range</small></div>
        <div class="stat"><span>Date range</span><strong id="s-range">—</strong><small>Calendar days currently displayed</small></div>
        <div class="stat"><span>Active days</span><strong id="s-active">—</strong><small>Days with at least one activity</small></div>
        <div class="stat"><span>Peak day</span><strong id="s-peak">—</strong><small>Highest activity count in one day</small></div>
      </div>
    </section>

    <section class="chart-card">
      <div class="chart-head">
        <div>
          <h2>Activity momentum</h2>
          <p>Zero-activity days stay on the calendar, so pauses and bursts remain visible.</p>
        </div>
        <div class="chart-actions">
          <div class="range-switch" role="group" aria-label="Time range">
            <button class="range-button" type="button" data-range="30" aria-pressed="false">30d</button>
            <button class="range-button" type="button" data-range="90" aria-pressed="false">90d</button>
            <button class="range-button" type="button" data-range="365" aria-pressed="false">365d</button>
          </div>
          <div class="range-pill" id="range-pill">—</div>
        </div>
      </div>

      <div class="canvas-wrap">
        <canvas id="chart" width="1500" height="660"></canvas>
      </div>

      <div class="legend">
        <span><i class="dot cyan"></i>Cumulative in range</span>
        <span><i class="dot violet"></i>7-day average</span>
        <span><i class="dot slate"></i>Daily activity</span>
      </div>
    </section>

    <section class="below">
      <div class="note-card">
        <h3>How to read it</h3>
        <ul>
          <li><strong>Cumulative in range</strong> resets at the start of the selected 30d, 90d, or 365d window.</li>
          <li><strong>Daily activity</strong> shows the exact count for each calendar day, including zeros.</li>
          <li><strong>7-day average</strong> smooths short spikes while still following the recent development tempo.</li>
          <li><strong>README output</strong> can be generated as a static SVG with <code>--format svg --days 30|90|365</code>.</li>
        </ul>
      </div>
      <div class="meta-card">
        <h3>Snapshot details</h3>
        <div class="meta-grid">
          <span>Source</span><strong id="m-source">—</strong>
          <span>Target</span><strong id="m-target">—</strong>
          <span>Filter</span><strong id="m-filter">—</strong>
          <span>Generated</span><strong id="m-generated">—</strong>
        </div>
      </div>
    </section>
  </main>

  <div id="tooltip" class="tooltip"></div>
  <script id="chart-data" type="application/json">${json}</script>
  <script>
  const payload = JSON.parse(document.getElementById('chart-data').textContent);
  const allData = payload.data || [];
  const meta = payload.meta || {};
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');
  const rangeButtons = Array.from(document.querySelectorAll('.range-button'));

  const pad = { l: 78, r: 72, t: 44, b: 82 };
  const W = canvas.width;
  const H = canvas.height;
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  let data = [];
  let selectedDays = Number(meta.defaultDays) || 90;
  let maxCum = 1;
  let maxDaily = 1;

  function isoToUtcMs(iso) {
    const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso || '');
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
  }

  function selectRange(days) {
    if (!allData.length) return [];
    const endMs = isoToUtcMs(allData[allData.length - 1].date);
    const startMs = endMs - (days - 1) * 86400000;
    let cumulative = 0;
    return allData
      .filter((point) => isoToUtcMs(point.date) >= startMs)
      .map((point) => {
        cumulative += point.commits;
        return { ...point, cumulative };
      });
  }

  function updateScale() {
    maxCum = Math.max(...data.map((point) => point.cumulative), 1);
    maxDaily = Math.max(...data.map((point) => Math.max(point.commits, point.ma7)), 1);
  }

  function x(index) {
    return pad.l + (index / Math.max(1, data.length - 1)) * plotW;
  }

  function yCum(value) {
    return pad.t + (1 - value / maxCum) * plotH;
  }

  function yDaily(value) {
    const barZoneTop = pad.t + plotH * 0.62;
    const barZoneH = plotH * 0.31;
    return barZoneTop + (1 - value / maxDaily) * barZoneH;
  }

  function yMa(value) {
    return pad.t + plotH * 0.62 + (1 - value / maxDaily) * (plotH * 0.31);
  }

  function fmtInt(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0);
  }

  function formatDate(iso, opts = { month: 'short', day: 'numeric', year: '2-digit' }) {
    const d = new Date(iso + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(undefined, { ...opts, timeZone: 'UTC' }).format(d);
  }

  function formatDateLong(iso) {
    return formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function daysLabel(n) {
    return n === 1 ? '1 day' : fmtInt(n) + ' days';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function fillLabels() {
    const activeDays = data.filter((point) => point.commits > 0).length;
    const first = data[0];
    const last = data[data.length - 1];
    const peak = data.reduce((a, b) => a.commits >= b.commits ? a : b, data[0] || { commits: 0, date: '—' });
    const total = data.reduce((sum, point) => sum + point.commits, 0);

    setText('s-total', fmtInt(total));
    setText('s-range', data.length ? daysLabel(data.length) : '—');
    setText('s-active', data.length ? activeDays + ' / ' + data.length : '—');
    setText('s-peak', data.length ? peak.commits + ' · ' + formatDate(peak.date, { month: 'short', day: 'numeric' }) : '—');
    setText('range-pill', data.length ? formatDateLong(first.date) + ' → ' + formatDateLong(last.date) : '—');
    setText('generated-label', meta.generatedAt ? 'Generated: ' + new Date(meta.generatedAt).toLocaleString() : 'Generated locally');
    setText('m-source', meta.source || '—');
    setText('m-target', meta.source === 'github' ? '@' + (meta.username || '—') : (meta.repo || '—'));
    setText('m-filter', meta.source === 'github' ? 'GitHub contribution calendar' : ((meta.branch || '—') + (meta.author ? ' · ' + meta.author : '')));
    setText('m-generated', meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : '—');
  }

  function linePath(points, yFn) {
    ctx.beginPath();
    points.forEach((point, index) => {
      const xx = x(index);
      const yy = yFn(point);
      if (index === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
  }

  function drawGrid() {
    ctx.save();
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(148, 163, 184, .14)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(148, 163, 184, .82)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const yy = pad.t + i * plotH / 5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(W - pad.r, yy);
      ctx.stroke();
      const value = Math.round(maxCum * (1 - i / 5));
      ctx.fillText(fmtInt(value), 18, yy);
    }

    ctx.fillStyle = 'rgba(34, 211, 238, .9)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('Cumulative', 18, pad.t + 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148, 163, 184, .78)';
    for (let i = 0; i <= 3; i++) {
      const value = Math.round(maxDaily * (1 - i / 3));
      const yy = pad.t + plotH * 0.62 + i * (plotH * 0.31) / 3;
      ctx.fillText(String(value), W - 18, yy);
    }
    ctx.fillStyle = 'rgba(148, 163, 184, .9)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('Daily', W - 18, pad.t + plotH * 0.62 - 12);
    ctx.textAlign = 'left';

    const ticks = Math.min(8, data.length);
    ctx.fillStyle = 'rgba(148, 163, 184, .78)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < ticks; i++) {
      const idx = Math.round(i * (data.length - 1) / Math.max(1, ticks - 1));
      const label = formatDate(data[idx].date, { month: 'short', day: 'numeric' });
      const xx = Math.min(W - pad.r - 46, Math.max(pad.l - 20, x(idx) - 24));
      ctx.fillText(label, xx, H - 35);
    }

    ctx.strokeStyle = 'rgba(226, 232, 240, .18)';
    ctx.beginPath();
    ctx.moveTo(pad.l, H - pad.b);
    ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();
    ctx.restore();
  }

  function drawBars() {
    const barW = Math.max(1.5, Math.min(13, plotW / Math.max(1, data.length) * 0.62));
    const base = pad.t + plotH * 0.93;
    ctx.fillStyle = 'rgba(71, 85, 105, .62)';
    data.forEach((point, index) => {
      if (point.commits <= 0) return;
      const xx = x(index) - barW / 2;
      const yy = yDaily(point.commits);
      roundRect(ctx, xx, yy, barW, base - yy, Math.min(4, barW / 2));
      ctx.fill();
    });
  }

  function drawAreaLine() {
    if (!data.length) return;
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, 'rgba(34, 211, 238, .35)');
    grad.addColorStop(.55, 'rgba(34, 211, 238, .10)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');

    ctx.beginPath();
    data.forEach((point, index) => {
      const xx = x(index);
      const yy = yCum(point.cumulative);
      if (index === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
    ctx.lineTo(x(data.length - 1), H - pad.b);
    ctx.lineTo(x(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    linePath(data.map((point) => point.cumulative), (value) => yCum(value));
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawAverage() {
    if (!data.length) return;
    linePath(data.map((point) => point.ma7), (value) => yMa(value));
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawHover(index) {
    if (!data.length) return;
    const point = data[index];
    const xx = x(index);
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, .35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(xx, pad.t);
    ctx.lineTo(xx, H - pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(xx, yCum(point.cumulative), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(index = null) {
    drawGrid();
    drawBars();
    drawAreaLine();
    drawAverage();
    if (index !== null) drawHover(index);
  }

  function nearestIndex(evt) {
    const rect = canvas.getBoundingClientRect();
    const px = (evt.clientX - rect.left) / rect.width * W;
    const ratio = (px - pad.l) / plotW;
    return Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))));
  }

  function showTooltip(evt, index) {
    const point = data[index];
    tooltip.style.display = 'block';
    tooltip.style.left = evt.clientX + 'px';
    tooltip.style.top = evt.clientY + 'px';
    tooltip.innerHTML =
      '<strong>' + formatDateLong(point.date) + '</strong>' +
      '<div class="tip-row"><span>Daily</span><b>' + fmtInt(point.commits) + '</b></div>' +
      '<div class="tip-row"><span>Cumulative</span><b>' + fmtInt(point.cumulative) + '</b></div>' +
      '<div class="tip-row"><span>7-day avg</span><b>' + point.ma7 + '</b></div>';
  }

  function roundRect(ctx, xValue, yValue, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    ctx.beginPath();
    ctx.moveTo(xValue + r, yValue);
    ctx.arcTo(xValue + width, yValue, xValue + width, yValue + height, r);
    ctx.arcTo(xValue + width, yValue + height, xValue, yValue + height, r);
    ctx.arcTo(xValue, yValue + height, xValue, yValue, r);
    ctx.arcTo(xValue, yValue, xValue + width, yValue, r);
    ctx.closePath();
  }

  function applyRange(days) {
    selectedDays = days;
    data = selectRange(days);
    updateScale();
    rangeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.range) === selectedDays));
    });
    tooltip.style.display = 'none';
    fillLabels();
    draw();
  }

  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => applyRange(Number(button.dataset.range)));
  });

  canvas.addEventListener('mousemove', (evt) => {
    if (!data.length) return;
    const index = nearestIndex(evt);
    draw(index);
    showTooltip(evt, index);
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
    draw();
  });

  applyRange(selectedDays);
  </script>
</body>
</html>`;
}

function renderSvg(title, description, meta, allData, days, themeName, hideBorder) {
  const data = selectRange(allData, days);
  const theme = SVG_THEMES[themeName];
  const width = 900;
  const height = 280;
  const pad = { left: 54, right: 26, top: 78, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxValue = Math.max(...data.map((point) => Math.max(point.commits, point.ma7)), 1);
  const total = data.reduce((sum, point) => sum + point.commits, 0);
  const activeDays = data.filter((point) => point.commits > 0).length;
  const first = data[0];
  const last = data.at(-1);

  const x = (index) => pad.left + (index / Math.max(1, data.length - 1)) * plotW;
  const y = (value) => pad.top + (1 - value / maxValue) * plotH;
  const baseline = pad.top + plotH;

  const linePath = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.commits).toFixed(2)}`).join(' ');
  const averagePath = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.ma7).toFixed(2)}`).join(' ');
  const areaPath = data.length ? `${linePath} L ${x(data.length - 1).toFixed(2)} ${baseline.toFixed(2)} L ${x(0).toFixed(2)} ${baseline.toFixed(2)} Z` : '';

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const yy = pad.top + i * plotH / 4;
    const value = Math.round(maxValue * (1 - i / 4));
    grid.push(`<line x1="${pad.left}" y1="${yy.toFixed(2)}" x2="${width - pad.right}" y2="${yy.toFixed(2)}" stroke="${theme.grid}" stroke-width="1"/>`);
    grid.push(`<text x="${pad.left - 12}" y="${(yy + 4).toFixed(2)}" fill="${theme.muted}" font-size="11" text-anchor="end">${value}</text>`);
  }

  const labels = [];
  const ticks = Math.min(6, data.length);
  for (let i = 0; i < ticks; i++) {
    const index = Math.round(i * (data.length - 1) / Math.max(1, ticks - 1));
    const label = svgDate(data[index].date, days >= 365);
    labels.push(`<text x="${x(index).toFixed(2)}" y="${height - 18}" fill="${theme.muted}" font-size="11" text-anchor="${i === 0 ? 'start' : (i === ticks - 1 ? 'end' : 'middle')}">${escapeXml(label)}</text>`);
  }

  const sourceLabel = meta.source === 'github'
    ? `@${meta.username || ''}`
    : `${meta.repo || 'repository'} · ${meta.branch || 'ref'}`;
  const rangeLabel = first && last ? `${svgDate(first.date, true)} → ${svgDate(last.date, true)}` : `${days}d`;
  const border = hideBorder ? 'none' : theme.border;
  const descriptionText = description || `${total} activities across ${activeDays} active days in the last ${days} days.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">${escapeXml(title)}</title>
  <desc id="chart-desc">${escapeXml(descriptionText)}</desc>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="${theme.background}" stroke="${border}"/>
  <text x="${pad.left}" y="30" fill="${theme.text}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="17" font-weight="700">${escapeXml(title)}</text>
  <text x="${pad.left}" y="51" fill="${theme.muted}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="11">${escapeXml(sourceLabel)} · ${escapeXml(rangeLabel)} · ${total} activities · ${activeDays} active days</text>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    ${grid.join('\n    ')}
    ${areaPath ? `<path d="${areaPath}" fill="${theme.area}"/>` : ''}
    ${averagePath ? `<path d="${averagePath}" fill="none" stroke="${theme.average}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.72" vector-effect="non-scaling-stroke"/>` : ''}
    ${linePath ? `<path d="${linePath}" fill="none" stroke="${theme.line}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ''}
    ${labels.join('\n    ')}
  </g>
</svg>\n`;
}

function svgDate(iso, includeYear) {
  const date = isoToUtcDate(iso);
  if (!date) return iso;
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date);
  const day = String(date.getUTCDate()).padStart(2, '0');
  return includeYear ? `${month} ${day}, ${date.getUTCFullYear()}` : `${month} ${day}`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[ch]));
}

async function main() {
  const args = parseArgs(process.argv);
  const sourceData = args.source === 'github'
    ? await readGithubDailyCounts(args.username)
    : readLocalGitDailyCounts(path.resolve(args.repo), args.branch, args.author);

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
  renderSvg: renderModernSvg,
  renderHtml: renderModernHtml,
  svgDate
};
