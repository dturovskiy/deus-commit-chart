'use strict';

const { dailyTotals } = require('./activity-metrics');
const RANGE_OPTIONS = [30, 90, 365];

const THEMES = {
  'github-compact': {
    background: '#0d1117',
    panel: '#111821',
    border: '#30363d',
    grid: '#21262d',
    text: '#f0f6fc',
    muted: '#8b949e',
    daily: '#39d353',
    trend: '#58a6ff',
    glow: '#56d364',
    areaTop: 'rgba(57, 211, 83, 0.24)',
    areaBottom: 'rgba(57, 211, 83, 0.015)'
  },
  'github-light': {
    background: '#ffffff',
    panel: '#f6f8fa',
    border: '#d0d7de',
    grid: '#d8dee4',
    text: '#24292f',
    muted: '#57606a',
    daily: '#1a7f37',
    trend: '#0969da',
    glow: '#2da44e',
    areaTop: 'rgba(26, 127, 55, 0.18)',
    areaBottom: 'rgba(26, 127, 55, 0.015)'
  }
};

const LAYOUT_PRESETS = {
  compact: {
    width: 900,
    height: 300,
    pad: { left: 54, right: 26, top: 88, bottom: 46 },
    titleSize: 17,
    metaSize: 11,
    labelSize: 11,
    dailyStroke: 2.25,
    trendStroke: 1.45,
    radius: 12
  },
  comfortable: {
    width: 1000,
    height: 350,
    pad: { left: 62, right: 34, top: 102, bottom: 54 },
    titleSize: 18,
    metaSize: 11.5,
    labelSize: 11.5,
    dailyStroke: 2.55,
    trendStroke: 1.6,
    radius: 15
  },
  spacious: {
    width: 1120,
    height: 410,
    pad: { left: 70, right: 42, top: 116, bottom: 62 },
    titleSize: 20,
    metaSize: 12,
    labelSize: 12,
    dailyStroke: 2.8,
    trendStroke: 1.75,
    radius: 18
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function isoToUtcMs(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
}

function formatDate(iso, includeYear = false) {
  const ms = isoToUtcMs(iso);
  if (!Number.isFinite(ms)) return iso;
  const date = new Date(ms);
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date);
  const day = String(date.getUTCDate()).padStart(2, '0');
  return includeYear ? `${month} ${day}, ${date.getUTCFullYear()}` : `${month} ${day}`;
}

function selectRange(data, days) {
  if (!Array.isArray(data) || !data.length) return [];
  const end = isoToUtcMs(data.at(-1).date);
  const start = end - (days - 1) * 86400000;
  let cumulative = 0;
  return data
    .filter((point) => isoToUtcMs(point.date) >= start)
    .map((point) => {
      cumulative += Number(point.commits) || 0;
      return { ...point, cumulative };
    });
}

function resolveLayout(options = {}) {
  const presetName = LAYOUT_PRESETS[options.layout] ? options.layout : 'comfortable';
  const preset = LAYOUT_PRESETS[presetName];
  const width = Number.isFinite(Number(options.width)) && Number(options.width) >= 640
    ? Number(options.width)
    : preset.width;
  const height = Number.isFinite(Number(options.height)) && Number(options.height) >= 240
    ? Number(options.height)
    : preset.height;
  const widthScale = width / preset.width;
  const heightScale = height / preset.height;
  return {
    name: presetName,
    width,
    height,
    pad: {
      left: Math.round(preset.pad.left * widthScale),
      right: Math.round(preset.pad.right * widthScale),
      top: Math.round(preset.pad.top * heightScale),
      bottom: Math.round(preset.pad.bottom * heightScale)
    },
    titleSize: preset.titleSize,
    metaSize: preset.metaSize,
    labelSize: preset.labelSize,
    dailyStroke: preset.dailyStroke,
    trendStroke: preset.trendStroke,
    radius: preset.radius
  };
}

function smoothPath(points, tension = 0.22) {
  // Monotone cubic Hermite interpolation (PCHIP-like), preserving flat intervals
  // and never overshooting neighboring samples; tension remains for compatibility.
  if (!Array.isArray(points) || !points.length) return '';
  const fmt = (v) => v.toFixed(2);
  if (points.length === 1) return 'M ' + fmt(points[0].x) + ' ' + fmt(points[0].y);
  const widths = [];
  const slopes = [];
  for (let i = 0; i < points.length - 1; i++) {
    const width = points[i + 1].x - points[i].x;
    if (!(width > 0)) throw new Error('Chart points must have increasing x coordinates');
    widths.push(width);
    slopes.push((points[i + 1].y - points[i].y) / width);
  }
  const tangents = Array(points.length).fill(0);
  tangents[0] = slopes[0];
  tangents[points.length - 1] = slopes[slopes.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const a = slopes[i - 1], b = slopes[i];
    if (a * b <= 0) continue;
    const w1 = 2 * widths[i] + widths[i - 1];
    const w2 = widths[i] + 2 * widths[i - 1];
    tangents[i] = (w1 + w2) / (w1 / a + w2 / b);
  }
  let result = 'M ' + fmt(points[0].x) + ' ' + fmt(points[0].y);
  for (let i = 0; i < widths.length; i++) {
    const p = points[i], q = points[i + 1], h = widths[i];
    const c1x = p.x + h / 3, c2x = q.x - h / 3;
    const c1y = p.y + tangents[i] * h / 3, c2y = q.y - tangents[i + 1] * h / 3;
    result += ' C ' + fmt(c1x) + ' ' + fmt(c1y) + ', ' +
      fmt(c2x) + ' ' + fmt(c2y) + ', ' + fmt(q.x) + ' ' + fmt(q.y);
  }
  return result;
}

function dailyBarRects(points, baseline, plotW) {
  // A discrete day owns one horizontal bin. Keep every bar inside the plot
  // and cap the width so 30d is substantial while 365d stays individually legible.
  const slot = plotW / Math.max(1, points.length);
  const width = Math.max(0.6, Math.min(24, slot * 0.72));
  const radius = Math.min(1.8, width / 3);
  return points.map((point) => ({
    x: Number((point.x - width / 2).toFixed(2)),
    y: Number(point.y.toFixed(2)),
    width: Number(width.toFixed(2)),
    height: Number(Math.max(0, baseline - point.y).toFixed(2)),
    radius: Number(radius.toFixed(2))
  }));
}

function chartGeometry(allData, days, layout) {
  const data = selectRange(allData, days);
  const { width, height, pad } = layout;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((point) => Math.max(Number(point.commits) || 0, Number(point.ma7) || 0)), 1);
  const maxValue = Math.max(1, rawMax * 1.14);
  const x = (index) => pad.left + ((index + 0.5) / Math.max(1, data.length)) * plotW;
  const y = (value) => pad.top + (1 - (Number(value) || 0) / maxValue) * plotH;
  const baseline = pad.top + plotH;
  const dailyPoints = data.map((point, index) => ({ x: x(index), y: y(point.commits) }));
  const trendPoints = data.map((point, index) => ({ x: x(index), y: y(point.ma7) }));
  const bars = dailyBarRects(dailyPoints, baseline, plotW);
  const trendPath = smoothPath(trendPoints, 0.24);
  return { data, plotW, plotH, maxValue, x, y, baseline, dailyPoints, trendPoints, bars, trendPath };
}

function buildTicks(data, x, days, layout) {
  const ticks = Math.min(days >= 365 ? 7 : 6, data.length);
  const labels = [];
  for (let i = 0; i < ticks; i++) {
    const index = Math.round(i * (data.length - 1) / Math.max(1, ticks - 1));
    const anchor = i === 0 ? 'start' : (i === ticks - 1 ? 'end' : 'middle');
    labels.push({
      x: x(index),
      text: formatDate(data[index].date, days >= 365),
      anchor,
      y: layout.height - Math.max(18, Math.round(layout.pad.bottom * 0.34))
    });
  }
  return labels;
}

function renderModernSvg(title, description, meta, allData, days, options = {}) {
  const themeName = THEMES[options.theme] ? options.theme : 'github-compact';
  const theme = THEMES[themeName];
  const layout = resolveLayout(options);
  const geometry = chartGeometry(allData, days, layout);
  const { data, maxValue, x, trendPath, bars } = geometry;
  const { total, activeDays } = dailyTotals(data);
  const first = data[0];
  const last = data.at(-1);
  const peak = data.reduce((best, point) => !best || point.commits > best.commits ? point : best, null);
  const sourceLabel = meta.source === 'github'
    ? `@${meta.username || ''}`
    : `${meta.repo || 'repository'} · ${meta.branch || 'ref'}`;
  const rangeLabel = first && last ? `${formatDate(first.date, true)} → ${formatDate(last.date, true)}` : `${days}d`;
  const activityUnit = meta.source === 'local' ? 'commits' : 'contributions';
  const descriptionText = description || `${total} ${activityUnit} across ${activeDays} active days in the last ${days} days.`;
  const border = options.hideBorder ? 'none' : theme.border;
  const grid = [];
  const gridLines = 3;
  for (let i = 0; i <= gridLines; i++) {
    const yy = layout.pad.top + i * geometry.plotH / gridLines;
    const value = Math.round(maxValue * (1 - i / gridLines));
    grid.push(`<line x1="${layout.pad.left}" y1="${yy.toFixed(2)}" x2="${layout.width - layout.pad.right}" y2="${yy.toFixed(2)}" stroke="${theme.grid}" stroke-width="1" opacity="${i === gridLines ? '0.9' : '0.52'}"/>`);
    grid.push(`<text x="${layout.pad.left - 14}" y="${(yy + 4).toFixed(2)}" fill="${theme.muted}" font-size="${layout.labelSize}" text-anchor="end" opacity="0.82">${value}</text>`);
  }
  const labels = buildTicks(data, x, days, layout)
    .map((tick) => `<text x="${tick.x.toFixed(2)}" y="${tick.y}" fill="${theme.muted}" font-size="${layout.labelSize}" text-anchor="${tick.anchor}" opacity="0.86">${escapeXml(tick.text)}</text>`);
  const barMarkup = bars.map((bar, index) => bar.height > 0
    ? `<rect data-series="daily" x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.radius}" fill="${index === bars.length - 1 && meta.currentDayPartial ? theme.glow : theme.daily}" opacity="${index === bars.length - 1 ? 1 : 0.82}"/>`
    : '').filter(Boolean).join('\n    ');
  const stamp = meta.generatedAt ? new Date(meta.generatedAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'unknown';
  const statLine = `${days} days · ${total} ${activityUnit} · ${activeDays} active days${peak ? ` · peak ${peak.commits}` : ''} · Updated ${stamp}${meta.currentDayPartial ? ' · Today partial' : ''} · Snapshot ${(meta.snapshotId || 'legacy').slice(0, 10)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">${escapeXml(title)}</title>
  <desc id="chart-desc">${escapeXml(descriptionText)}</desc>
  <defs>
    <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.panel}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${theme.background}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${layout.width - 1}" height="${layout.height - 1}" rx="${layout.radius}" fill="url(#chart-bg)" stroke="${border}"/>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <text x="${layout.pad.left}" y="34" fill="${theme.text}" font-size="${layout.titleSize}" font-weight="700" letter-spacing="-0.25">${escapeXml(title)}</text>
    <text x="${layout.pad.left}" y="58" fill="${theme.muted}" font-size="${layout.metaSize}">${escapeXml(sourceLabel)} · ${escapeXml(rangeLabel)}</text>
    <text x="${layout.pad.left}" y="78" fill="${theme.muted}" font-size="${layout.metaSize}" opacity="0.94">${escapeXml(statLine)}</text>
    <g transform="translate(${layout.width - layout.pad.right - 182},30)" font-size="${layout.metaSize}" fill="${theme.muted}">
      <rect x="3" y="-5" width="17" height="8" rx="2" fill="${theme.daily}"/>
      <text x="33" y="4">Daily</text>
      <line x1="92" y1="0" x2="117" y2="0" stroke="${theme.trend}" stroke-width="2" stroke-linecap="round" opacity="0.92"/>
      <text x="125" y="4">7d trend</text>
    </g>
    ${grid.join('\n    ')}
    <g data-chart-series="daily-bars">
      ${barMarkup}
    </g>
    ${trendPath ? `<path data-series="trend" d="${trendPath}" fill="none" stroke="${theme.trend}" stroke-width="${Math.max(2, layout.trendStroke)}" stroke-linejoin="round" stroke-linecap="round" opacity="0.94" vector-effect="non-scaling-stroke"/>` : ''}
    ${labels.join('\n    ')}
  </g>
</svg>\n`;
}

function renderModernHtml(title, description, meta, allData, options = {}) {
  const themeName = THEMES[options.theme] ? options.theme : 'github-compact';
  const theme = THEMES[themeName];
  const layout = resolveLayout(options);
  const payload = JSON.stringify({ title, description, meta, data: allData, theme, layout }).replace(/</g, '\\u003c');
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description || 'An interactive bar chart of daily GitHub contributions with a smooth 7-day trend line and selectable time windows.');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: dark; --bg:#070a0f; --panel:#0d1117; --line:#21262d; --line-2:#30363d; --text:#f0f6fc; --muted:#8b949e; --green:#39d353; --blue:#58a6ff; }
    * { box-sizing: border-box; }
    html, body { margin:0; min-height:100%; }
    body { color:var(--text); background:radial-gradient(circle at 18% -10%, rgba(57,211,83,.10), transparent 32rem), radial-gradient(circle at 84% 0%, rgba(88,166,255,.08), transparent 30rem), #070a0f; font:14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { width:min(1240px, calc(100vw - 28px)); margin:0 auto; padding:34px 0 48px; }
    .shell { border:1px solid rgba(48,54,61,.82); border-radius:24px; background:rgba(13,17,23,.90); box-shadow:0 30px 100px rgba(0,0,0,.38); overflow:hidden; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding:24px 26px 18px; border-bottom:1px solid rgba(48,54,61,.66); }
    .eyebrow { margin:0 0 6px; color:#7ee787; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,3.3vw,38px); line-height:1.08; letter-spacing:-.04em; }
    .sub { margin:8px 0 0; color:var(--muted); max-width:760px; }
    .controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    .switch { display:inline-flex; gap:4px; border:1px solid var(--line-2); border-radius:999px; padding:4px; background:#090d13; }
    button { border:0; border-radius:999px; background:transparent; color:var(--muted); padding:7px 12px; cursor:pointer; font:700 12px/1 ui-sans-serif,system-ui; }
    button:hover { color:var(--text); }
    button[aria-pressed="true"] { color:#d8ffe0; background:rgba(57,211,83,.13); box-shadow:inset 0 0 0 1px rgba(57,211,83,.24); }
    button:focus-visible { outline:2px solid var(--green); outline-offset:2px; }
    .stamp { border:1px solid var(--line-2); border-radius:999px; padding:7px 11px; color:var(--muted); font-size:11px; white-space:nowrap; }
    .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; background:var(--line); border-bottom:1px solid var(--line); }
    .stat { background:#0d1117; padding:15px 18px; min-height:78px; }
    .stat span { display:block; color:var(--muted); font-size:11px; }
    .stat strong { display:block; margin-top:5px; font-size:20px; letter-spacing:-.03em; }
    .chart-wrap { position:relative; padding:18px; background:linear-gradient(180deg,#0d1117,#0a0e14); overflow-x:auto; overscroll-behavior-x:contain; }
    #chart { width:100%; height:auto; min-height:300px; display:block; border-radius:18px; }
    .foot { display:flex; justify-content:space-between; gap:18px; align-items:center; padding:14px 24px 18px; color:var(--muted); font-size:12px; border-top:1px solid rgba(48,54,61,.55); }
    .legend { display:flex; gap:16px; flex-wrap:wrap; }
    .legend span { display:inline-flex; align-items:center; gap:7px; }
    .swatch { width:16px; height:9px; background:var(--green); border-radius:2px; }
    .swatch.trend { width:25px; height:0; background:transparent; border-top:2px solid var(--blue); border-radius:999px; opacity:.94; }
    .scroll-hint { display:none; margin:0; padding:10px 14px 0; color:var(--muted); font-size:12px; }
    .chart-wrap:focus-visible { outline:2px solid var(--blue); outline-offset:-3px; }
    .tooltip { position:fixed; display:none; pointer-events:none; transform:translate(-50%,-118%); z-index:10; min-width:190px; padding:11px 12px; border:1px solid var(--line-2); border-radius:13px; background:rgba(5,8,13,.96); box-shadow:0 18px 60px rgba(0,0,0,.55); }
    .tooltip strong { display:block; margin-bottom:7px; }
    .tip-row { display:flex; justify-content:space-between; gap:18px; color:var(--muted); margin-top:4px; font-size:12px; }
    .tip-row b { color:var(--text); }
    @media(max-width:820px){ .head{display:block}.controls{justify-content:flex-start;margin-top:16px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.foot{display:block}.legend{margin-bottom:8px} #chart{min-width:${layout.width}px;min-height:0} .scroll-hint{display:block} }
    @media(max-width:520px){ main{width:min(100vw - 16px,1240px);padding-top:8px}.shell{border-radius:18px}.head{padding:20px 18px 16px}.stats{grid-template-columns:1fr 1fr}.stat{padding:13px}.chart-wrap{padding:8px}.stamp{display:none} }
  </style>
</head>
<body>
  <main>
    <section class="shell">
      <header class="head">
        <div>
          <p class="eyebrow">Deus Commit Chart</p>
          <h1>${safeTitle}</h1>
          <p class="sub">${safeDescription}</p>
        </div>
        <div class="controls">
          <div class="switch" role="group" aria-label="Time range">
            <button type="button" data-range="30" aria-pressed="false">30d</button>
            <button type="button" data-range="90" aria-pressed="false">90d</button>
            <button type="button" data-range="365" aria-pressed="false">365d</button>
          </div>
          <div class="stamp" id="range-label">—</div>
        </div>
      </header>
      <div class="stats">
        <div class="stat"><span id="stat-total-label">Contributions</span><strong id="stat-total">—</strong></div>
        <div class="stat"><span>Active days</span><strong id="stat-active">—</strong></div>
        <div class="stat"><span>Peak day</span><strong id="stat-peak">—</strong></div>
        <div class="stat"><span>Data freshness</span><strong id="stat-fresh">—</strong></div>
      </div>
      <p class="scroll-hint" id="chart-scroll-hint">Swipe sideways to view all days; the newest day is on the right.</p>
      <div class="chart-wrap" id="chart-scroll" role="region" aria-label="Scrollable daily contribution chart" aria-describedby="chart-scroll-hint" tabindex="0">
        <svg id="chart" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Contribution activity chart"></svg>
      </div>
      <footer class="foot">
        <div class="legend"><span><i class="swatch"></i>Daily activity</span><span><i class="swatch trend"></i>7d trend</span></div>
        <div><span id="privacy-note"></span> Today's count is incomplete. Range switches rebuild the SVG in-browser from embedded data without API requests.</div>
      </footer>
    </section>
  </main>
  <div class="tooltip" id="tooltip"></div>
  <script id="chart-data" type="application/json">${payload}</script>
  <script>
  (() => {
    const payload = JSON.parse(document.getElementById('chart-data').textContent);
    const allData = payload.data || [];
    const meta = payload.meta || {};
    const activityUnit = meta.source === 'local' ? 'commits' : 'contributions';
    const theme = payload.theme;
    const layout = payload.layout;
    const chart = document.getElementById('chart');
    const tooltip = document.getElementById('tooltip');
    const buttons = Array.from(document.querySelectorAll('[data-range]'));
    let selectedDays = [30,90,365].includes(Number(location.hash.replace('#','').replace('d',''))) ? Number(location.hash.replace('#','').replace('d','')) : (Number(meta.defaultDays) || 90);
    let visible = [];
    let geometry = null;

    // The browser uses exactly the same pure functions as the static SVG.
    // No geometry/range/tick implementations are maintained independently.
    const isoToUtcMs = ${isoToUtcMs.toString()};
    const isoMs = isoToUtcMs;
    const formatDate = ${formatDate.toString()};
    const fmtDate = formatDate;
    const fmtNum = (n) => new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(n || 0);
    const selectRange = ${selectRange.toString()};
    const select = (days) => selectRange(allData, days);
    const smoothPath = ${smoothPath.toString()};
    const dailyBarRects = ${dailyBarRects.toString()};
    const chartGeometry = ${chartGeometry.toString()};
    const buildTicks = ${buildTicks.toString()};
    const dailyTotals = ${dailyTotals.toString()};
    const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));

    function buildGeometry() {
      const g = chartGeometry(allData, selectedDays, layout);
      return { ...g, pad: layout.pad, width: layout.width, height: layout.height };
    }

    function render() {
      geometry = buildGeometry();
      const g=geometry, {total,activeDays:active}=dailyTotals(visible);
      const first=visible[0], last=visible[visible.length-1];
      const peak=visible.reduce((best,p)=>!best||p.commits>best.commits?p:best,null);
      const grid=[];
      for(let i=0;i<=3;i++){
        const yy=g.pad.top+i*g.plotH/3, value=Math.round(g.maxValue*(1-i/3));
        grid.push('<line x1="'+g.pad.left+'" y1="'+yy.toFixed(2)+'" x2="'+(g.width-g.pad.right)+'" y2="'+yy.toFixed(2)+'" stroke="'+theme.grid+'" stroke-width="1" opacity="'+(i===3?'.9':'.52')+'"/>');
        grid.push('<text x="'+(g.pad.left-14)+'" y="'+(yy+4).toFixed(2)+'" fill="'+theme.muted+'" font-size="'+layout.labelSize+'" text-anchor="end" opacity=".82">'+value+'</text>');
      }
      const labels = buildTicks(visible, g.x, selectedDays, layout).map(tick =>
        '<text x="'+tick.x.toFixed(2)+'" y="'+tick.y+'" fill="'+theme.muted+'" font-size="'+layout.labelSize+'" text-anchor="'+tick.anchor+'" opacity=".86">'+esc(tick.text)+'</text>');
      const bars=g.bars.map((bar,i)=>bar.height>0?'<rect data-series="daily" x="'+bar.x+'" y="'+bar.y+'" width="'+bar.width+'" height="'+bar.height+'" rx="'+bar.radius+'" fill="'+(i===g.bars.length-1&&meta.currentDayPartial?theme.glow:theme.daily)+'" opacity="'+(i===g.bars.length-1?'1':'.82')+'"/>':'').join('');
      chart.innerHTML = '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+theme.panel+'" stop-opacity=".72"/><stop offset="1" stop-color="'+theme.background+'"/></linearGradient></defs>'+
        '<rect x=".5" y=".5" width="'+(g.width-1)+'" height="'+(g.height-1)+'" rx="'+layout.radius+'" fill="url(#bg)" stroke="'+theme.border+'"/>'+
        '<g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">'+
        '<text x="'+g.pad.left+'" y="34" fill="'+theme.text+'" font-size="'+layout.titleSize+'" font-weight="700">'+esc(payload.title)+'</text>'+
        '<text x="'+g.pad.left+'" y="58" fill="'+theme.muted+'" font-size="'+layout.metaSize+'">'+esc((meta.source==='github'?'@'+(meta.username||''):((meta.repo||'repository')+' · '+(meta.branch||'ref'))))+' · '+esc(first&&last?(fmtDate(first.date,true)+' → '+fmtDate(last.date,true)):(selectedDays+'d'))+'</text>'+
        '<text x="'+g.pad.left+'" y="78" fill="'+theme.muted+'" font-size="'+layout.metaSize+'">'+selectedDays+' days · '+fmtNum(total)+' '+activityUnit+' · '+active+' active days'+(peak?' · peak '+peak.commits:'')+'</text>'+
        '<g transform="translate('+(g.width-g.pad.right-182)+',30)" font-size="'+layout.metaSize+'" fill="'+theme.muted+'"><rect x="3" y="-5" width="17" height="8" rx="2" fill="'+theme.daily+'"/><text x="33" y="4">Daily</text><line x1="92" y1="0" x2="117" y2="0" stroke="'+theme.trend+'" stroke-width="2" stroke-linecap="round" opacity=".92"/><text x="125" y="4">7d trend</text></g>'+
        grid.join('')+'<g data-chart-series="daily-bars">'+bars+'</g>'+(g.trendPath?'<path data-series="trend" d="'+g.trendPath+'" fill="none" stroke="'+theme.trend+'" stroke-width="'+Math.max(2,layout.trendStroke)+'" stroke-linejoin="round" stroke-linecap="round" opacity=".94"/>':'')+labels.join('')+'</g>';
      document.getElementById('stat-total-label').textContent=meta.source==='local'?'Commits':'Contributions';
      document.getElementById('stat-total').textContent=fmtNum(total);
      document.getElementById('stat-active').textContent=active+' / '+visible.length;
      document.getElementById('stat-peak').textContent=peak?(peak.commits+' · '+fmtDate(peak.date,false)):'—';
      document.getElementById('stat-fresh').textContent=meta.generatedAt?new Intl.RelativeTimeFormat(undefined,{numeric:'auto'}).format(-Math.max(0,Math.round((Date.now()-new Date(meta.generatedAt).getTime())/3600000)),'hour'):'embedded';
      document.getElementById('range-label').textContent=first&&last?(fmtDate(first.date,true)+' → '+fmtDate(last.date,true)):'—';
      const privacy=document.getElementById('privacy-note');
      if (privacy) {
        privacy.textContent=meta.source==='github'
          ? 'Daily aggregates follow GitHub token visibility and account settings; no private contribution breakdown is published.'
          : 'Local Git activity source.';
      }
    }

    function applyRange(days) {
      selectedDays=days;
      visible=select(days);
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.range)===days)));
      history.replaceState(null,'','#'+days+'d');
      tooltip.style.display='none';
      render();
      // Keep the newest observations initially visible in a narrow, scrollable chart.
      if (typeof window !== 'undefined' && window.innerWidth <= 820) {
        const scroller=document.getElementById('chart-scroll');
        if (scroller) scroller.scrollLeft=scroller.scrollWidth;
      }
    }

    chart.addEventListener('pointermove',(evt)=>{
      if(!visible.length||!geometry)return;
      const rect=chart.getBoundingClientRect();
      const svgX=(evt.clientX-rect.left)/rect.width*layout.width;
      const ratio=(svgX-layout.pad.left)/Math.max(1,geometry.plotW);
      const idx=Math.max(0,Math.min(visible.length-1,Math.floor(ratio*visible.length)));
      const p=visible[idx];
      tooltip.style.display='block'; tooltip.style.left=evt.clientX+'px'; tooltip.style.top=evt.clientY+'px';
      tooltip.innerHTML='<strong>'+fmtDate(p.date,true)+'</strong><div class="tip-row"><span>Daily</span><b>'+fmtNum(p.commits)+'</b></div><div class="tip-row"><span>7d trend</span><b>'+Number(p.ma7).toFixed(2)+'</b></div>';
    });
    chart.addEventListener('pointerleave',()=>{tooltip.style.display='none';});
    buttons.forEach(b=>b.addEventListener('click',()=>applyRange(Number(b.dataset.range))));
    applyRange(selectedDays);
  })();
  </script>
</body>
</html>`;
}

module.exports = {
  LAYOUT_PRESETS,
  THEMES,
  resolveLayout,
  selectRange,
  buildTicks,
  smoothPath,
  dailyBarRects,
  chartGeometry,
  renderModernSvg,
  renderModernHtml
};
