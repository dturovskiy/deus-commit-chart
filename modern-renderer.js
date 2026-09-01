'use strict';

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
  if (!Array.isArray(points) || !points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const segmentMinY = Math.min(p1.y, p2.y);
    const segmentMaxY = Math.max(p1.y, p2.y);

    const c1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: clamp(p1.y + (p2.y - p0.y) * tension, segmentMinY, segmentMaxY)
    };
    const c2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: clamp(p2.y - (p3.y - p1.y) * tension, segmentMinY, segmentMaxY)
    };

    path += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

function chartGeometry(allData, days, layout) {
  const data = selectRange(allData, days);
  const { width, height, pad } = layout;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((point) => Math.max(Number(point.commits) || 0, Number(point.ma7) || 0)), 1);
  const maxValue = Math.max(1, rawMax * 1.14);
  const x = (index) => pad.left + (index / Math.max(1, data.length - 1)) * plotW;
  const y = (value) => pad.top + (1 - (Number(value) || 0) / maxValue) * plotH;
  const baseline = pad.top + plotH;
  const dailyPoints = data.map((point, index) => ({ x: x(index), y: y(point.commits) }));
  const trendPoints = data.map((point, index) => ({ x: x(index), y: y(point.ma7) }));
  const dailyPath = smoothPath(dailyPoints, 0.18);
  const trendPath = smoothPath(trendPoints, 0.24);
  const areaPath = dailyPoints.length
    ? `${dailyPath} L ${dailyPoints.at(-1).x.toFixed(2)} ${baseline.toFixed(2)} L ${dailyPoints[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`
    : '';
  return { data, plotW, plotH, maxValue, x, y, baseline, dailyPoints, trendPoints, dailyPath, trendPath, areaPath };
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
  const { data, maxValue, x, dailyPath, trendPath, areaPath, dailyPoints } = geometry;
  const total = data.reduce((sum, point) => sum + (Number(point.commits) || 0), 0);
  const activeDays = data.filter((point) => Number(point.commits) > 0).length;
  const first = data[0];
  const last = data.at(-1);
  const peak = data.reduce((best, point) => !best || point.commits > best.commits ? point : best, null);
  const sourceLabel = meta.source === 'github'
    ? `@${meta.username || ''}`
    : `${meta.repo || 'repository'} · ${meta.branch || 'ref'}`;
  const rangeLabel = first && last ? `${formatDate(first.date, true)} → ${formatDate(last.date, true)}` : `${days}d`;
  const descriptionText = description || `${total} contributions across ${activeDays} active days in the last ${days} days.`;
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
  const lastPoint = dailyPoints.at(-1);
  const statLine = `${days} days · ${total} contributions · ${activeDays} active days${peak ? ` · peak ${peak.commits}` : ''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="chart-title chart-desc">
  <title id="chart-title">${escapeXml(title)}</title>
  <desc id="chart-desc">${escapeXml(descriptionText)}</desc>
  <defs>
    <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.panel}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${theme.background}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="daily-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.daily}" stop-opacity="0.23"/>
      <stop offset="0.58" stop-color="${theme.daily}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${theme.daily}" stop-opacity="0"/>
    </linearGradient>
    <filter id="point-glow" x="-300%" y="-300%" width="700%" height="700%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0.5" y="0.5" width="${layout.width - 1}" height="${layout.height - 1}" rx="${layout.radius}" fill="url(#chart-bg)" stroke="${border}"/>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <text x="${layout.pad.left}" y="34" fill="${theme.text}" font-size="${layout.titleSize}" font-weight="700" letter-spacing="-0.25">${escapeXml(title)}</text>
    <text x="${layout.pad.left}" y="58" fill="${theme.muted}" font-size="${layout.metaSize}">${escapeXml(sourceLabel)} · ${escapeXml(rangeLabel)}</text>
    <text x="${layout.pad.left}" y="78" fill="${theme.muted}" font-size="${layout.metaSize}" opacity="0.94">${escapeXml(statLine)}</text>
    <g transform="translate(${layout.width - layout.pad.right - 182},30)" font-size="${layout.metaSize}" fill="${theme.muted}">
      <line x1="0" y1="0" x2="25" y2="0" stroke="${theme.daily}" stroke-width="2.6" stroke-linecap="round"/>
      <text x="33" y="4">Daily</text>
      <line x1="92" y1="0" x2="117" y2="0" stroke="${theme.trend}" stroke-width="1.7" stroke-dasharray="5 6" stroke-linecap="round" opacity="0.72"/>
      <text x="125" y="4">7d trend</text>
    </g>
    ${grid.join('\n    ')}
    ${areaPath ? `<path d="${areaPath}" fill="url(#daily-area)"/>` : ''}
    ${trendPath ? `<path d="${trendPath}" fill="none" stroke="${theme.trend}" stroke-width="${layout.trendStroke}" stroke-dasharray="5 7" stroke-linejoin="round" stroke-linecap="round" opacity="0.66" vector-effect="non-scaling-stroke"/>` : ''}
    ${dailyPath ? `<path d="${dailyPath}" fill="none" stroke="${theme.daily}" stroke-width="${layout.dailyStroke}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ''}
    ${lastPoint ? `<circle cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="3.2" fill="${theme.daily}" filter="url(#point-glow)"/>` : ''}
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
  const safeDescription = escapeHtml(description || 'A live SVG view of daily GitHub contribution activity with a 7-day trend line and selectable time windows.');

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
    .chart-wrap { position:relative; padding:18px; background:linear-gradient(180deg,#0d1117,#0a0e14); }
    #chart { width:100%; height:auto; min-height:300px; display:block; border-radius:18px; }
    .foot { display:flex; justify-content:space-between; gap:18px; align-items:center; padding:14px 24px 18px; color:var(--muted); font-size:12px; border-top:1px solid rgba(48,54,61,.55); }
    .legend { display:flex; gap:16px; flex-wrap:wrap; }
    .legend span { display:inline-flex; align-items:center; gap:7px; }
    .swatch { width:25px; height:0; border-top:2px solid var(--green); border-radius:999px; }
    .swatch.trend { border-color:var(--blue); border-top-style:dashed; opacity:.72; }
    .tooltip { position:fixed; display:none; pointer-events:none; transform:translate(-50%,-118%); z-index:10; min-width:190px; padding:11px 12px; border:1px solid var(--line-2); border-radius:13px; background:rgba(5,8,13,.96); box-shadow:0 18px 60px rgba(0,0,0,.55); }
    .tooltip strong { display:block; margin-bottom:7px; }
    .tip-row { display:flex; justify-content:space-between; gap:18px; color:var(--muted); margin-top:4px; font-size:12px; }
    .tip-row b { color:var(--text); }
    @media(max-width:820px){ .head{display:block}.controls{justify-content:flex-start;margin-top:16px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.foot{display:block}.legend{margin-bottom:8px} }
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
        <div class="stat"><span>Contributions</span><strong id="stat-total">—</strong></div>
        <div class="stat"><span>Active days</span><strong id="stat-active">—</strong></div>
        <div class="stat"><span>Peak day</span><strong id="stat-peak">—</strong></div>
        <div class="stat"><span>Data freshness</span><strong id="stat-fresh">—</strong></div>
      </div>
      <div class="chart-wrap">
        <svg id="chart" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Contribution activity chart"></svg>
      </div>
      <footer class="foot">
        <div class="legend"><span><i class="swatch"></i>Daily activity</span><span><i class="swatch trend"></i>7d trend</span></div>
        <div><span id="privacy-note"></span> Range switches rebuild the SVG in-browser from the embedded 365-day dataset; no API request is made on click.</div>
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
    const theme = payload.theme;
    const layout = payload.layout;
    const chart = document.getElementById('chart');
    const tooltip = document.getElementById('tooltip');
    const buttons = Array.from(document.querySelectorAll('[data-range]'));
    let selectedDays = [30,90,365].includes(Number(location.hash.replace('#','').replace('d',''))) ? Number(location.hash.replace('#','').replace('d','')) : (Number(meta.defaultDays) || 90);
    let visible = [];
    let geometry = null;

    const isoMs = (iso) => {
      const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso || '');
      return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
    };
    const fmtDate = (iso, year = false) => {
      const ms = isoMs(iso); if (!Number.isFinite(ms)) return iso;
      const d = new Date(ms);
      const month = new Intl.DateTimeFormat(undefined,{month:'short',timeZone:'UTC'}).format(d);
      const day = String(d.getUTCDate()).padStart(2,'0');
      return year ? month + ' ' + day + ', ' + d.getUTCFullYear() : month + ' ' + day;
    };
    const fmtNum = (n) => new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(n || 0);
    const select = (days) => {
      if (!allData.length) return [];
      const end = isoMs(allData[allData.length - 1].date);
      const start = end - (days - 1) * 86400000;
      let cumulative = 0;
      return allData.filter(p => isoMs(p.date) >= start).map(p => ({...p,cumulative:(cumulative += Number(p.commits)||0)}));
    };
    const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
    const smooth = (pts,tension) => {
      if (!pts.length) return '';
      if (pts.length === 1) return 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2);
      if (pts.length === 2) return 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2) + ' L ' + pts[1].x.toFixed(2) + ' ' + pts[1].y.toFixed(2);
      let d = 'M ' + pts[0].x.toFixed(2) + ' ' + pts[0].y.toFixed(2);
      for (let i=0;i<pts.length-1;i++) {
        const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
        const minY=Math.min(p1.y,p2.y), maxY=Math.max(p1.y,p2.y);
        const c1x=p1.x+(p2.x-p0.x)*tension, c1y=clamp(p1.y+(p2.y-p0.y)*tension,minY,maxY);
        const c2x=p2.x-(p3.x-p1.x)*tension, c2y=clamp(p2.y-(p3.y-p1.y)*tension,minY,maxY);
        d += ' C ' + c1x.toFixed(2)+' '+c1y.toFixed(2)+', '+c2x.toFixed(2)+' '+c2y.toFixed(2)+', '+p2.x.toFixed(2)+' '+p2.y.toFixed(2);
      }
      return d;
    };
    const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));

    function buildGeometry() {
      const pad=layout.pad, width=layout.width, height=layout.height;
      const plotW=width-pad.left-pad.right, plotH=height-pad.top-pad.bottom;
      const rawMax=Math.max(...visible.map(p=>Math.max(Number(p.commits)||0,Number(p.ma7)||0)),1);
      const maxValue=Math.max(1,rawMax*1.14);
      const x=(i)=>pad.left+(i/Math.max(1,visible.length-1))*plotW;
      const y=(v)=>pad.top+(1-(Number(v)||0)/maxValue)*plotH;
      const baseline=pad.top+plotH;
      const daily=visible.map((p,i)=>({x:x(i),y:y(p.commits)}));
      const trend=visible.map((p,i)=>({x:x(i),y:y(p.ma7)}));
      return {pad,width,height,plotW,plotH,maxValue,x,y,baseline,daily,trend,dailyPath:smooth(daily,.18),trendPath:smooth(trend,.24)};
    }

    function render() {
      geometry = buildGeometry();
      const g=geometry, total=visible.reduce((s,p)=>s+(Number(p.commits)||0),0), active=visible.filter(p=>Number(p.commits)>0).length;
      const first=visible[0], last=visible[visible.length-1];
      const peak=visible.reduce((best,p)=>!best||p.commits>best.commits?p:best,null);
      const grid=[];
      for(let i=0;i<=3;i++){
        const yy=g.pad.top+i*g.plotH/3, value=Math.round(g.maxValue*(1-i/3));
        grid.push('<line x1="'+g.pad.left+'" y1="'+yy.toFixed(2)+'" x2="'+(g.width-g.pad.right)+'" y2="'+yy.toFixed(2)+'" stroke="'+theme.grid+'" stroke-width="1" opacity="'+(i===3?'.9':'.52')+'"/>');
        grid.push('<text x="'+(g.pad.left-14)+'" y="'+(yy+4).toFixed(2)+'" fill="'+theme.muted+'" font-size="'+layout.labelSize+'" text-anchor="end" opacity=".82">'+value+'</text>');
      }
      const ticks=Math.min(selectedDays>=365?7:6,visible.length), labels=[];
      for(let i=0;i<ticks;i++){
        const idx=Math.round(i*(visible.length-1)/Math.max(1,ticks-1));
        const anchor=i===0?'start':(i===ticks-1?'end':'middle');
        labels.push('<text x="'+g.x(idx).toFixed(2)+'" y="'+(layout.height-Math.max(18,Math.round(layout.pad.bottom*.34)))+'" fill="'+theme.muted+'" font-size="'+layout.labelSize+'" text-anchor="'+anchor+'" opacity=".86">'+esc(fmtDate(visible[idx].date,selectedDays>=365))+'</text>');
      }
      const area=g.daily.length ? g.dailyPath+' L '+g.daily[g.daily.length-1].x.toFixed(2)+' '+g.baseline.toFixed(2)+' L '+g.daily[0].x.toFixed(2)+' '+g.baseline.toFixed(2)+' Z' : '';
      const lastPoint=g.daily[g.daily.length-1];
      chart.innerHTML = '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+theme.panel+'" stop-opacity=".72"/><stop offset="1" stop-color="'+theme.background+'"/></linearGradient><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+theme.daily+'" stop-opacity=".23"/><stop offset=".58" stop-color="'+theme.daily+'" stop-opacity=".07"/><stop offset="1" stop-color="'+theme.daily+'" stop-opacity="0"/></linearGradient><filter id="glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+
        '<rect x=".5" y=".5" width="'+(g.width-1)+'" height="'+(g.height-1)+'" rx="'+layout.radius+'" fill="url(#bg)" stroke="'+theme.border+'"/>'+
        '<g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">'+
        '<text x="'+g.pad.left+'" y="34" fill="'+theme.text+'" font-size="'+layout.titleSize+'" font-weight="700">'+esc(payload.title)+'</text>'+
        '<text x="'+g.pad.left+'" y="58" fill="'+theme.muted+'" font-size="'+layout.metaSize+'">'+esc((meta.source==='github'?'@'+(meta.username||''):((meta.repo||'repository')+' · '+(meta.branch||'ref'))))+' · '+esc(first&&last?(fmtDate(first.date,true)+' → '+fmtDate(last.date,true)):(selectedDays+'d'))+'</text>'+
        '<text x="'+g.pad.left+'" y="78" fill="'+theme.muted+'" font-size="'+layout.metaSize+'">'+selectedDays+' days · '+fmtNum(total)+' contributions · '+active+' active days'+(peak?' · peak '+peak.commits:'')+'</text>'+
        '<g transform="translate('+(g.width-g.pad.right-182)+',30)" font-size="'+layout.metaSize+'" fill="'+theme.muted+'"><line x1="0" y1="0" x2="25" y2="0" stroke="'+theme.daily+'" stroke-width="2.6" stroke-linecap="round"/><text x="33" y="4">Daily</text><line x1="92" y1="0" x2="117" y2="0" stroke="'+theme.trend+'" stroke-width="1.7" stroke-dasharray="5 6" stroke-linecap="round" opacity=".72"/><text x="125" y="4">7d trend</text></g>'+
        grid.join('')+(area?'<path d="'+area+'" fill="url(#area)"/>':'')+(g.trendPath?'<path d="'+g.trendPath+'" fill="none" stroke="'+theme.trend+'" stroke-width="'+layout.trendStroke+'" stroke-dasharray="5 7" stroke-linejoin="round" stroke-linecap="round" opacity=".66"/>':'')+(g.dailyPath?'<path d="'+g.dailyPath+'" fill="none" stroke="'+theme.daily+'" stroke-width="'+layout.dailyStroke+'" stroke-linejoin="round" stroke-linecap="round"/>':'')+(lastPoint?'<circle cx="'+lastPoint.x.toFixed(2)+'" cy="'+lastPoint.y.toFixed(2)+'" r="3.2" fill="'+theme.daily+'" filter="url(#glow)"/>':'')+labels.join('')+'</g>';
      document.getElementById('stat-total').textContent=fmtNum(total);
      document.getElementById('stat-active').textContent=active+' / '+visible.length;
      document.getElementById('stat-peak').textContent=peak?(peak.commits+' · '+fmtDate(peak.date,false)):'—';
      document.getElementById('stat-fresh').textContent=meta.generatedAt?new Intl.RelativeTimeFormat(undefined,{numeric:'auto'}).format(-Math.max(0,Math.round((Date.now()-new Date(meta.generatedAt).getTime())/3600000)),'hour'):'embedded';
      document.getElementById('range-label').textContent=first&&last?(fmtDate(first.date,true)+' → '+fmtDate(last.date,true)):'—';
      const privacy=document.getElementById('privacy-note');
      if (privacy) {
        privacy.textContent=meta.source==='github'
          ? ((Number(meta.restrictedContributionsCount)||0)>0
              ? ('Includes '+fmtNum(meta.restrictedContributionsCount)+' anonymized private/internal contribution counts.')
              : 'No restricted private/internal counts were returned by the current GitHub token.')
          : 'Local source.';
      }
    }

    function applyRange(days) {
      selectedDays=days;
      visible=select(days);
      buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.range)===days)));
      history.replaceState(null,'','#'+days+'d');
      tooltip.style.display='none';
      render();
    }

    chart.addEventListener('pointermove',(evt)=>{
      if(!visible.length||!geometry)return;
      const rect=chart.getBoundingClientRect();
      const svgX=(evt.clientX-rect.left)/rect.width*layout.width;
      const ratio=(svgX-layout.pad.left)/Math.max(1,geometry.plotW);
      const idx=Math.max(0,Math.min(visible.length-1,Math.round(ratio*(visible.length-1))));
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
  smoothPath,
  renderModernSvg,
  renderModernHtml
};
