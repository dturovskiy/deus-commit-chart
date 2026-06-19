#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = {
    repo: '.',
    branch: 'main',
    out: 'mia-commit-chart.html',
    author: '',
    title: 'mia-platform commit activity',
    description: ''
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--repo') { out.repo = next; i++; }
    else if (arg === '--branch') { out.branch = next; i++; }
    else if (arg === '--out') { out.out = next; i++; }
    else if (arg === '--author') { out.author = next; i++; }
    else if (arg === '--title') { out.title = next; i++; }
    else if (arg === '--description') { out.description = next; i++; }
    else if (arg === '--help' || arg === '-h') usage(0);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return out;
}

function usage(code) {
  console.log(`Usage:\n  node generate-commit-chart.js --repo /path/to/mia-platform --branch main --out mia-commit-chart.html\n\nOptions:\n  --repo          Path to local git clone\n  --branch        Branch/ref to read, default: main\n  --author        Optional git author filter, example: --author dturovskiy\n  --title         Chart title\n  --description   Optional short subtitle\n  --out           Output HTML file`);
  process.exit(code);
}

function readGitDates(repo, branch, author) {
  const args = ['-C', repo, 'log', '--date=short', '--format=%ad'];
  if (author) args.push(`--author=${author}`);
  args.push(branch);

  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || 'git log failed').trim());

  return result.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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

function buildSeries(dates) {
  const counts = new Map();
  for (const date of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) counts.set(date, (counts.get(date) || 0) + 1);
  }

  const activeKeys = Array.from(counts.keys()).sort();
  if (!activeKeys.length) return [];

  const start = isoToUtcDate(activeKeys[0]);
  const end = isoToUtcDate(activeKeys[activeKeys.length - 1]);
  const series = [];
  let cumulative = 0;

  for (let cursor = start, index = 0; cursor <= end; cursor = addDays(cursor, 1), index++) {
    const date = utcDateToIso(cursor);
    const commits = counts.get(date) || 0;
    cumulative += commits;

    const windowStart = Math.max(0, series.length - 6);
    const previousSix = series.slice(windowStart).map((p) => p.commits);
    const windowValues = previousSix.concat(commits);
    const ma7 = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;

    series.push({
      date,
      commits,
      cumulative,
      ma7: Number(ma7.toFixed(2))
    });
  }

  return series;
}

function html(title, description, meta, data) {
  const json = JSON.stringify({ title, description, meta, data }).replace(/</g, '\\u003c');
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description || 'Одноразовий чистий зріз Git-історії: накопичені коміти, денні піки, 7-денне середнє і періоди пауз.');

  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050816;
      --surface: rgba(15, 23, 42, .78);
      --surface-2: rgba(2, 6, 23, .72);
      --line: rgba(148, 163, 184, .16);
      --line-strong: rgba(226, 232, 240, .22);
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

    .subtitle {
      margin: 18px 0 0;
      max-width: 760px;
      color: #b5c2d4;
      font-size: 15px;
    }

    .quick-read {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 24px;
      position: relative;
      z-index: 1;
    }

    .mini {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(2, 6, 23, .42);
      padding: 13px 14px;
    }

    .mini strong { display: block; font-size: 13px; color: var(--text); }
    .mini span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; }

    .stats {
      border-radius: 28px;
      padding: 14px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .stat {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(2, 6, 23, .48);
      padding: 15px 16px;
      min-height: 92px;
    }

    .stat span {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.25;
    }

    .stat strong {
      display: block;
      margin-top: 8px;
      font-size: clamp(22px, 3vw, 30px);
      line-height: 1;
      letter-spacing: -.045em;
      color: #f8fafc;
    }

    .stat small { display: block; margin-top: 7px; color: var(--muted-2); font-size: 11px; }

    .chart-card {
      border-radius: 30px;
      padding: 18px;
    }

    .chart-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin: 0 2px 14px;
    }

    .chart-head h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
    .chart-head p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }

    .range-pill {
      white-space: nowrap;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 11px;
      background: rgba(2, 6, 23, .52);
      color: #cbd5e1;
      font-size: 12px;
    }

    .canvas-wrap {
      position: relative;
      border: 1px solid var(--line);
      border-radius: 24px;
      overflow: hidden;
      background: #020617;
    }

    canvas { width: 100%; height: auto; display: block; }

    .legend {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
      margin: 14px 2px 0;
    }

    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(2, 6, 23, .36);
      padding: 7px 10px;
    }

    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .cyan { background: var(--cyan); box-shadow: 0 0 16px rgba(34, 211, 238, .65); }
    .violet { background: var(--violet); }
    .slate { background: var(--slate); }

    .below {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
      gap: 14px;
      margin-top: 14px;
    }

    .note-card, .meta-card {
      border-radius: 24px;
      padding: 18px;
    }

    .note-card h3, .meta-card h3 { margin: 0 0 10px; font-size: 15px; }

    .note-card ul {
      margin: 0;
      padding-left: 18px;
      color: #b8c4d6;
    }

    .note-card li { margin: 7px 0; }

    .meta-grid {
      display: grid;
      grid-template-columns: 96px minmax(0, 1fr);
      gap: 7px 10px;
      color: var(--muted);
      font-size: 12px;
    }

    .meta-grid strong {
      color: #dbeafe;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

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
      .range-pill { display: inline-block; margin-top: 10px; }
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
      <div class="badge">Local Git snapshot</div>
      <div id="generated-label">Generated locally</div>
    </div>

    <section class="hero">
      <div class="intro">
        <div>
          <p class="eyebrow">MIA platform · commit chart</p>
          <h1>${safeTitle}</h1>
          <p class="subtitle">${safeDescription}</p>
        </div>
        <div class="quick-read">
          <div class="mini"><strong>Що це?</strong><span>Один HTML-файл з історією комітів із локального Git repo.</span></div>
          <div class="mini"><strong>Як читати?</strong><span>Блакитна лінія росте завжди, стовпчики показують денні коміти.</span></div>
          <div class="mini"><strong>Для чого?</strong><span>Швидко побачити темп розробки, піки і паузи.</span></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><span>Total commits</span><strong id="s-total">—</strong><small>У вибраному branch/ref</small></div>
        <div class="stat"><span>Date range</span><strong id="s-range">—</strong><small>Від першого до останнього коміта</small></div>
        <div class="stat"><span>Active days</span><strong id="s-active">—</strong><small>Дні, де був хоча б один коміт</small></div>
        <div class="stat"><span>Peak day</span><strong id="s-peak">—</strong><small>Максимум комітів за день</small></div>
      </div>
    </section>

    <section class="chart-card">
      <div class="chart-head">
        <div>
          <h2>Commit momentum</h2>
          <p>Календарна шкала включає нульові дні, тому паузи і ривки видно чесно.</p>
        </div>
        <div class="range-pill" id="range-pill">—</div>
      </div>

      <div class="canvas-wrap">
        <canvas id="chart" width="1500" height="660"></canvas>
      </div>

      <div class="legend">
        <span><i class="dot cyan"></i>Cumulative commits</span>
        <span><i class="dot violet"></i>7-day average</span>
        <span><i class="dot slate"></i>Daily commits</span>
      </div>
    </section>

    <section class="below">
      <div class="note-card">
        <h3>Короткий опис</h3>
        <ul>
          <li><strong>Cumulative commits</strong> — загальна кількість комітів на цю дату. Це головна BTC-style лінія.</li>
          <li><strong>Daily commits</strong> — скільки комітів було зроблено в конкретний день; порожні дні показані як нуль.</li>
          <li><strong>7-day average</strong> — згладжений темп за останні 7 календарних днів, щоб не плутатись через випадкові піки.</li>
        </ul>
      </div>
      <div class="meta-card">
        <h3>Snapshot details</h3>
        <div class="meta-grid">
          <span>Repo</span><strong id="m-repo">—</strong>
          <span>Branch</span><strong id="m-branch">—</strong>
          <span>Author</span><strong id="m-author">—</strong>
          <span>Generated</span><strong id="m-generated">—</strong>
        </div>
      </div>
    </section>
  </main>

  <div id="tooltip" class="tooltip"></div>
  <script id="chart-data" type="application/json">${json}</script>
  <script>
  const payload = JSON.parse(document.getElementById('chart-data').textContent);
  const data = payload.data || [];
  const meta = payload.meta || {};
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');

  const pad = { l: 78, r: 72, t: 44, b: 82 };
  const W = canvas.width;
  const H = canvas.height;
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxCum = Math.max(...data.map((p) => p.cumulative), 1);
  const maxDaily = Math.max(...data.map((p) => p.commits), 1);
  const activeDays = data.filter((p) => p.commits > 0).length;
  const first = data[0];
  const last = data[data.length - 1];
  const peak = data.reduce((a, b) => a.commits >= b.commits ? a : b, data[0] || { commits: 0, date: '—' });

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
    const d = new Date(iso + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(undefined, opts).format(d);
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
    setText('s-total', fmtInt(maxCum));
    setText('s-range', data.length ? daysLabel(data.length) : '—');
    setText('s-active', activeDays + ' / ' + data.length);
    setText('s-peak', peak.commits + ' · ' + formatDate(peak.date, { month: 'short', day: 'numeric' }));
    setText('range-pill', data.length ? formatDateLong(first.date) + ' → ' + formatDateLong(last.date) : '—');
    setText('generated-label', meta.generatedAt ? 'Generated: ' + new Date(meta.generatedAt).toLocaleString() : 'Generated locally');
    setText('m-repo', meta.repo || '—');
    setText('m-branch', meta.branch || '—');
    setText('m-author', meta.author || 'all authors');
    setText('m-generated', meta.generatedAt ? new Date(meta.generatedAt).toLocaleString() : '—');
  }

  function linePath(points, yFn, xOffset = 0) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const xx = x(i) + xOffset;
      const yy = yFn(p);
      if (i === 0) ctx.moveTo(xx, yy);
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

    ctx.save();
    ctx.translate(18, pad.t + 16);
    ctx.fillStyle = 'rgba(34, 211, 238, .9)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('Cumulative', 0, 0);
    ctx.restore();

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
    data.forEach((p, i) => {
      if (p.commits <= 0) return;
      const xx = x(i) - barW / 2;
      const yy = yDaily(p.commits);
      roundRect(ctx, xx, yy, barW, base - yy, Math.min(4, barW / 2));
      ctx.fill();
    });
  }

  function drawAreaLine() {
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, 'rgba(34, 211, 238, .35)');
    grad.addColorStop(.55, 'rgba(34, 211, 238, .10)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0)');

    ctx.beginPath();
    data.forEach((p, i) => {
      const xx = x(i);
      const yy = yCum(p.cumulative);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
    ctx.lineTo(x(data.length - 1), H - pad.b);
    ctx.lineTo(x(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    linePath(data.map((p) => p.cumulative), (v) => yCum(v));
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawAverage() {
    linePath(data.map((p) => p.ma7), (v) => yMa(v));
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawHover(index) {
    if (!data.length) return;
    const p = data[index];
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
    ctx.arc(xx, yCum(p.cumulative), 5, 0, Math.PI * 2);
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
    const p = data[index];
    tooltip.style.display = 'block';
    tooltip.style.left = evt.clientX + 'px';
    tooltip.style.top = evt.clientY + 'px';
    tooltip.innerHTML =
      '<strong>' + formatDateLong(p.date) + '</strong>' +
      '<div class="tip-row"><span>Daily</span><b>' + fmtInt(p.commits) + '</b></div>' +
      '<div class="tip-row"><span>Cumulative</span><b>' + fmtInt(p.cumulative) + '</b></div>' +
      '<div class="tip-row"><span>7-day avg</span><b>' + p.ma7 + '</b></div>';
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

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

  fillLabels();
  draw();
  </script>
</body>
</html>`;
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

function main() {
  const args = parseArgs(process.argv);
  const repo = path.resolve(args.repo);
  const dates = readGitDates(repo, args.branch, args.author);
  const series = buildSeries(dates);
  if (!series.length) throw new Error('No commits found for the selected ref/author.');

  const activeDays = series.filter((p) => p.commits > 0).length;
  const meta = {
    repo,
    branch: args.branch,
    author: args.author || null,
    generatedAt: new Date().toISOString(),
    totalCommits: series.at(-1).cumulative,
    activeDays,
    calendarDays: series.length,
    startDate: series[0].date,
    endDate: series.at(-1).date
  };

  fs.writeFileSync(path.resolve(args.out), html(args.title, args.description, meta, series), 'utf8');
  console.log(`Wrote ${path.resolve(args.out)}`);
  console.log(`${meta.totalCommits} commits across ${meta.activeDays} active days / ${meta.calendarDays} calendar days`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
