'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { utcWindow } = require('../contribution-snapshot');
const { createAssetBundle, writeBundle } = require('../build-activity-assets');

const ROOT = path.resolve(__dirname, '..');
const yaml = fs.readFileSync(path.join(ROOT, 'docs/PROFILE_WORKFLOW_EXAMPLE.yml'), 'utf8');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');

function run(exe, args, cwd, env = {}) {
  const result = spawnSync(exe, args, {
    cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 20000,
    maxBuffer: 1024 * 1024
  });
  assert.equal(result.status, 0,
    exe + ' ' + args.slice(0, 2).join(' ') + ' failed: ' + (result.stderr || result.stdout));
  return result.stdout.trim();
}
function makeBundle(repo, count) {
  const destination = path.join(repo, 'activity-dist');
  if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
  const asOf = '2026-10-10T11:00:00.000Z';
  const w = utcWindow(asOf);
  const counts = new Map();
  for (let ms = Date.parse(w.startDate + 'T00:00:00Z'); ms <= Date.parse(w.endDate + 'T00:00:00Z'); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    counts.set(date, date === w.endDate ? count : 0);
  }
  const { assets } = createAssetBundle({
    counts, asOf, startDate: w.startDate, endDate: w.endDate,
    sourceDetails: { type: 'github', username: 'test-user' }
  });
  writeBundle(destination, assets);
}
function exampleShell() {
  const head = yaml.indexOf('        run: |\n');
  assert.ok(head > -1, 'standalone template has one publishing shell block');
  const block = yaml.slice(head + '        run: |\n'.length);
  return block.split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n');
}

test('Marketplace README gives users an opt-in/manual profile workflow, not mandatory scheduled CI', () => {
  assert.match(readme, /docs\/PROFILE_WORKFLOW_EXAMPLE\.yml/);
  assert.match(readme, /manual-only without any cron or polling/i);
  assert.match(readme, /privacy|private activity/i);
  assert.doesNotMatch(readme, /a smooth daily activity line and area|git log --date=short --format=%ad/);
  assert.match(yaml, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(yaml, /^  schedule:/m);
  assert.doesNotMatch(yaml, /\bcron:|\bschedule:/);
  assert.match(yaml, /uses: dturovskiy\/deus-commit-chart@v1\.5\.3/);
  assert.match(yaml, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.doesNotMatch(yaml, /git push (?:-f|--force)|upload-artifact|download-artifact|npm test/);
});

test('copy-paste publisher creates branch, keeps source intact, avoids identical commit and advances safely', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-readme-consumer-'));
  try {
    const remote = path.join(parent, 'remote.git');
    const repo = path.join(parent, 'profile');
    fs.mkdirSync(repo);
    run('git', ['init', '--bare', remote], parent);
    run('git', ['init', '-b', 'main'], repo);
    run('git', ['config', 'user.name', 'Fixture'], repo);
    run('git', ['config', 'user.email', 'fixture@example.invalid'], repo);
    fs.writeFileSync(path.join(repo, 'README.md'), 'source stays untouched\n');
    run('git', ['add', 'README.md'], repo);
    run('git', ['commit', '-m', 'initial source'], repo);
    run('git', ['remote', 'add', 'origin', remote], repo);
    run('git', ['push', '-u', 'origin', 'main'], repo);
    const baseline = run('git', ['rev-parse', 'HEAD'], repo);

    const env = { GITHUB_WORKSPACE: repo, TARGET_BRANCH: 'activity-assets' };
    makeBundle(repo, 3);
    const script = exampleShell();
    run('bash', ['-e', '-c', script], repo, env);
    const first = run('git', ['ls-remote', '--heads', 'origin', 'activity-assets'], repo).split(/\s+/)[0];
    assert.match(first, /^[0-9a-f]{40}$/);
    assert.equal(run('git', ['show', 'origin/main:README.md'], repo), 'source stays untouched');
    assert.equal(run('git', ['rev-parse', 'HEAD'], repo), baseline);
    assert.match(fs.readFileSync(path.join(repo, 'README.md'), 'utf8'), /source stays untouched/);

    run('bash', ['-e', '-c', script], repo, env);
    const second = run('git', ['ls-remote', '--heads', 'origin', 'activity-assets'], repo).split(/\s+/)[0];
    assert.equal(second, first, 'identical published bytes must not create another commit');

    makeBundle(repo, 15);
    run('bash', ['-e', '-c', script], repo, env);
    const third = run('git', ['ls-remote', '--heads', 'origin', 'activity-assets'], repo).split(/\s+/)[0];
    assert.notEqual(third, second);
    run('git', ['fetch', 'origin', 'activity-assets'], repo);
    const published = run('git', ['show', 'FETCH_HEAD:activity-30d.svg'], repo);
    assert.match(published, /30 days · 15 contributions/);
    assert.equal(run('git', ['rev-parse', 'HEAD'], repo), baseline);
    assert.match(fs.readFileSync(path.join(repo, 'README.md'), 'utf8'), /source stays untouched/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
