'use strict';

// The public Marketplace repository carries source, tests, legal/security
// disclosures and the one copy-ready consumer example; confidential
// maintainer checklists and audit runbooks live outside this public tree.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
