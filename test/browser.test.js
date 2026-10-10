'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { utcWindow, assertCalendar, mergeCalendarWeeks, fetchGithubDailyCounts } =
  require('../contribution-snapshot');
const { createAssetBundle } = require('../build-activity-assets');

const asOf = new Date('2026-10-10T12:35:17Z');
function source() {
  const w = utcWindow(asOf);
  const days = [];
  for (let t = Date.parse(w.from); t <= Date.parse(w.endDate + 'T00:00:00Z'); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);
    days.push({ date, contributionCount: date === '2026-10-10' ? 22 : 0 });
  }
  const counts = assertCalendar([{ contributionDays: days }], w.startDate, w.endDate);
  return { days, source: { counts, asOf: asOf.toISOString(),
    startDate: w.startDate, endDate: w.endDate,
    sourceDetails: { type: 'github', username: 'dturovskiy',
      totalCommitContributions: 22, restrictedContributionsCount: 0,
      hasAnyRestrictedContributions: false } } };
}

test('an omitted first-day primary calendar is recovered by short edge alias', async () => {
  const fixture = source();
  let calls = 0;
  const result = await fetchGithubDailyCounts('dturovskiy', {
    token: 'fixture-only', asOf, attempts: 1,
    fetchImpl: async (_, opts) => {
      calls++;
      const variables = JSON.parse(opts.body).variables;
      assert.equal(variables.edgeFrom, '2025-09-27T00:00:00.000Z');
      assert.match(JSON.parse(opts.body).query, /edge: contributionsCollection/);
      return { ok: true, status: 200, json: async () => ({
        data: { user: {
          contributionsCollection: {
            totalCommitContributions: 22,
            restrictedContributionsCount: 0,
            hasAnyRestrictedContributions: false,
            contributionCalendar: { totalContributions: 22,
              weeks: [{ contributionDays: fixture.days.slice(1) }] }
          },
          edge: { contributionCalendar: {
            weeks: [{ contributionDays: fixture.days.slice(0, 16) }]
          } }
        } }
      }) };
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.counts.size, 365);
  assert.equal(result.counts.get('2025-10-11'), 0);
  const conflicting = fixture.days.map(p => ({ ...p }));
  conflicting[1].contributionCount = 10;
  assert.throws(() => mergeCalendarWeeks(
    [{ contributionDays: fixture.days }],
    [{ contributionDays: conflicting.slice(0, 2) }]
  ), /Inconsistent overlapping GitHub calendar day/);
});

test('embedded browser script executes and rebuilds chart for 30/90/365 without new API fetch', () => {
  const { assets, manifest } = createAssetBundle(source().source);
  const html = assets['index.html'];
  const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/);
  const payload = html.match(/<script id="chart-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(inlineScript && payload, 'embedded chart scripts are present');

  const elements = {};
  const el = (id) => {
    if (!elements[id]) {
      elements[id] = { innerHTML: '', textContent: '', style: {},
        listeners: {}, attributes: {},
        addEventListener(type, callback) { this.listeners[type] = callback; },
        setAttribute(key, value) { this.attributes[key] = value; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 1120, height: 410 }; }
      };
    }
    return elements[id];
  };
  const buttons = [30, 90, 365].map(days => {
    const node = el('button-' + days);
    node.dataset = { range: String(days) };
    return node;
  });
  el('chart-data').textContent = payload[1];
  const history = { replaceState() {} };
  const fakeDocument = {
    getElementById: el,
    querySelectorAll(selector) {
      assert.equal(selector, '[data-range]');
      return buttons;
    }
  };
  el('chart-scroll').scrollWidth = 1120;
  const context = { document: fakeDocument, location: { hash: '#30d' }, history,
    window: { innerWidth: 390 }, Date, Intl, Number, Math, String, JSON, Array };
  vm.runInNewContext(inlineScript[1], context, { timeout: 1500 });
  assert.match(el('chart').innerHTML, /30 days · 22 contributions/);
  assert.match(el('chart').innerHTML, /<g data-chart-series="daily-bars">/);
  assert.match(el('chart').innerHTML, /<rect data-series="daily"/);
  assert.match(el('chart').innerHTML, /<path data-series="trend" d="M /);
  assert.equal((el('chart').innerHTML.match(/<rect data-series="daily"/g) || []).length, 1);
  assert.doesNotMatch(el('chart').innerHTML, /<path data-series="daily"/);
  // Pointer positions now use day-bin centers rather than line-plot endpoints.
  el('chart').listeners.pointermove({ clientX: 1059, clientY: 180 });
  assert.match(el('tooltip').innerHTML, /Oct 10, 2026/);
  assert.match(el('tooltip').innerHTML, /<b>22<\/b>/);
  assert.equal(el('stat-total').textContent, '22');
  assert.equal(el('chart-scroll').scrollLeft, 1120, 'mobile starts on newest bars');
  assert.equal(el('stat-active').textContent, '1 / 30');
  assert.equal(buttons[0].attributes['aria-pressed'], 'true');
  buttons[1].listeners.click();
  assert.match(el('chart').innerHTML, /90 days · 22 contributions/);
  assert.equal((el('chart').innerHTML.match(/<rect data-series="daily"/g) || []).length, 1);
  assert.equal(buttons[1].attributes['aria-pressed'], 'true');
  buttons[2].listeners.click();
  assert.match(el('chart').innerHTML, /365 days · 22 contributions/);
  assert.equal((el('chart').innerHTML.match(/<rect data-series="daily"/g) || []).length, 1);
  assert.equal(manifest.ranges[365].total, 22);
});
