'use strict';

// The public Marketplace repository carries source, tests, legal/security
// disclosures and the one copy-ready consumer example; confidential
// maintainer checklists and audit runbooks live outside this public tree.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DOCS = ['PROFILE_WORKFLOW_EXAMPLE.yml'];

test('tracked public docs expose only the supported consumer example', () => {
  const actual = fs.readdirSync(path.join(ROOT, 'docs')).sort();
  assert.deepEqual(actual, PUBLIC_DOCS);
  const text = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(text, /docs\/PROFILE_WORKFLOW_EXAMPLE\.yml/);
  assert.match(text, /v1\.5\.2/);
});

test('public markdown links do not point at deleted internal documentation', () => {
  const files = ['README.md', 'SECURITY.md', 'PRIVACY.md', 'EULA.md', 'CONTRIBUTING.md'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const references = [...text.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]);
    for (const ref of references) {
      if (/^(?:https?:|mailto:|#)/.test(ref)) continue;
      const name = ref.split('#')[0];
      // Paths in the public prose are relative to the prose file.
      const target = path.resolve(ROOT, path.dirname(f), name);
      assert.ok(target.startsWith(ROOT + path.sep), 'Invalid public relative link in ' + f);
      assert.ok(fs.existsSync(target), 'Missing public document reference in ' + f + ': ' + name);
    }
  }
});

test('no archival checklist or internal investigation remains in public docs', () => {
  for (const name of PUBLIC_DOCS) assert.ok(fs.existsSync(path.join(ROOT, 'docs', name)));
  for (const name of ['REMEDIATION_CHECKLIST.md', 'TECH_DEBT_REGISTER.md',
    'REPO_HYGIENE_AND_SECRETS_AUDIT.md', 'GOD_MODULES_AUDIT.md',
    'RELEASE_RISK_DECISIONS.md']) {
    assert.equal(fs.existsSync(path.join(ROOT, 'docs', name)), false);
  }
});

test('local credentials, keys and scratch artifacts are ignored by default', () => {
  const localOnly = [
    '.env.production', '.envrc', 'config/private.pem', 'config/private.key',
    'keys/local.p12', 'keys/local.pfx', 'id_rsa', 'id_ed25519',
    'credentials.json', 'secrets.json', 'debug.log',
    'scratch.bak', 'scratch.orig', '.cache/cache.json', 'data.sqlite',
  ];
  for (const f of localOnly) {
    const result = spawnSync('git', ['check-ignore', '--no-index', '-q', '--', f], {
      cwd: ROOT, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 0, 'Expected local-only file to be ignored: ' + f);
  }
});

test('generated output directories and diagnostic files stay untracked', () => {
  const generatedPaths = [
    'activity-dist/index.html',
    'deus-commit-chart-dist/activity-30d.svg',
    '.tmp-qa.json',
    'tmp/chart.json',
    'temp/debug.txt',
    'playwright-report/index.html',
    'test-results/screenshot.png',
    '.nyc_output/report.json',
    '.mypy_cache/cache.db',
    '.ruff_cache/cache.db',
    'deus-chart.tgz',
    'cpu.cpuprofile',
    'memory.heapprofile',
  ];
  for (const file of generatedPaths) {
    const probe = spawnSync('git', ['check-ignore', '--no-index', '-q', '--', file], {
      cwd: ROOT, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(probe.status, 0, 'Expected generated file to be ignored: ' + file);
  }

  // A clean public source repository should never track generated bundles,
  // private local files or CI/debug output. The generated activity-assets
  // branch is intentionally independent from this source-branch guard.
  const tracked = spawnSync('git', ['ls-files', '-z'], {
    cwd: ROOT, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(tracked.status, 0, 'Could not inspect tracked source');
  const names = tracked.stdout.split('\0').filter(Boolean);
  const forbidden = /(?:^|\/)(?:activity-dist|deus-commit-chart-dist|dist|tmp|temp|playwright-report|test-results|__pycache__|node_modules)\/|(?:^|\/)\.tmp-|(?:^|\/)(?:cache-audit\.json|[^/]+\.(?:log|tgz|cpuprofile|heapprofile))$/;
  assert.deepEqual(names.filter(name => forbidden.test(name)), [],
    'Generated or temporary artifacts must not be committed on main');
});

test('brand logo is retained, obsolete MIA-specific wrapper is retired', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/deus-apps-logo.svg')),
    'Owner brand asset must remain in source history');
  assert.equal(fs.existsSync(path.join(ROOT, 'run-mia-commit-chart.sh')), false,
    'Old project-specific helper should not be restored');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /run-mia-commit-chart\.sh|mia-platform/);
  assert.match(readme, /node generate-commit-chart\.js/);
});
