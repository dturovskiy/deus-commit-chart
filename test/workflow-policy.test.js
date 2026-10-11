'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = (name) => fs.readFileSync(path.join(__dirname, '../.github/workflows', name), 'utf8');
const triggerSection = (yaml) => yaml.split(/\njobs:\n/)[0];

test('CI executes only for PRs targeting main, never push/schedule/dispatch', () => {
  const content = workflow('smoke.yml');
  const header = triggerSection(content);
  assert.match(header, /\non:\n  pull_request:\n    branches: \[main\]/);
  assert.doesNotMatch(header, /(?:\n  push:|\n  schedule:|\n  workflow_dispatch:)/);
  assert.match(header, /permissions:\n  contents: read/);
});

test('profile publisher has only one six-hour scheduled job and optional manual dispatch', () => {
  const content = workflow('publish-pages.yml');
  const header = triggerSection(content);
  assert.match(header, /cron: '17 \*\/6 \* \* \*'/);
  assert.match(header, /\n  workflow_dispatch:/);
  assert.doesNotMatch(header, /(?:\n  push:|\n  pull_request:)/);
  assert.deepEqual([...content.split('\njobs:\n')[1].matchAll(/^  ([a-z][\w-]+):$/gm)].map(m => m[1]), ['publish']);
  assert.match(content, /if: github.ref == 'refs\/heads\/main'/);
  assert.match(content, /permissions:\n      contents: write/);
  assert.doesNotMatch(content, /npm (?:test|run check|ci|install)|upload-artifact|download-artifact/);
  assert.match(content, /node build-activity-assets\.js/);
  assert.match(content, /node verify-activity-assets\.js dist/);
  assert.match(content, /node ci\/should-publish\.js "\$previous_dir" dist/);
  assert.match(content, /git archive FETCH_HEAD \| tar -xf - -C "\$previous_dir"/);
  assert.match(content, /if \[\[ "\$decision" -eq 0 \]\]; then/);
  assert.match(content, /python3 ci\/validate-svg\.py dist/);
  assert.match(content, /git push origin "HEAD:refs\/heads\/\$TARGET_BRANCH"/);
  assert.doesNotMatch(content, /git push --force/);
  assert.match(content, /group: activity-assets/);
});

test('freshness check and README cache probe never run automatically or modify issues', () => {
  const monitor = workflow('monitor-freshness.yml');
  const cache = workflow('audit-readme-cache.yml');
  for(const content of [monitor,cache]) {
    const header = triggerSection(content);
    assert.match(header, /\non:\n(?:  #.*\n)*  workflow_dispatch:/);
    assert.doesNotMatch(header, /\n  (?:schedule|push|pull_request):/);
    assert.doesNotMatch(content, /cron:|upload-artifact|download-artifact/);
  }
  assert.doesNotMatch(monitor, /issues: write|gh issue create|gh issue close|if: failure\(\)/);
  assert.match(monitor, /CHART_MAX_AGE_HOURS: \$\{\{ inputs\.max_age_hours \|\| '24' \}\}/);
  assert.match(monitor, /max_age_hours:/);
  assert.match(monitor, /if: always\(\)/);
  assert.match(monitor, /GITHUB_STEP_SUMMARY/);
});

test('Marketplace composite Action entry point remains unchanged in the runtime pipeline', () => {
  const action = fs.readFileSync(path.join(__dirname, '../action.yml'), 'utf8');
  assert.match(action, /runs:\n  using: composite/);
  assert.match(action, /node "\$GITHUB_ACTION_PATH\/build-activity-assets\.js"/);
  assert.match(action, /node "\$GITHUB_ACTION_PATH\/verify-activity-assets\.js"/);
  assert.match(action, /source: github or local|Data source: github or local/);
  assert.doesNotMatch(action, /npm (?:ci|install)/);
});

test('Marketplace inputs/outputs preserve the signed v1.4.1 public contract', () => {
  const action = fs.readFileSync(path.join(__dirname, '../action.yml'), 'utf8');
  const section = (from, to) => action.split(new RegExp('^' + from + ':\\s*$', 'm'))[1]
    .split(new RegExp('^' + to + ':\\s*$', 'm'))[0];
  const keys = text => [...text.matchAll(/^  ([a-z][\w-]+):$/gm)].map(match => match[1]);
  assert.deepEqual(keys(section('inputs','outputs')), [
    'source','username','token','repo','branch','author','default-days',
    'ranges','theme','layout','width','height','hide-border','output-dir','title'
  ]);
  assert.deepEqual(keys(section('outputs','runs')), ['output-dir','index-html']);
});

test('external GitHub Actions are pinned to reviewed full release SHAs', () => {
  const shaCheckout = '11d5960a326750d5838078e36cf38b85af677262';
  const shaSetup = '49933ea5288caeca8642d1e84afbd3f7d6820020';
  const files = [
    '../action.yml',
    '../.github/workflows/publish-pages.yml',
    '../.github/workflows/smoke.yml',
    '../.github/workflows/monitor-freshness.yml',
    '../.github/workflows/audit-readme-cache.yml'
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(__dirname,file),'utf8');
    for (const {name,sha} of [
      {name:'actions/checkout',sha:shaCheckout},
      {name:'actions/setup-node',sha:shaSetup}
    ]) {
      for(const match of content.matchAll(new RegExp('uses: ' + name + '@([^\\s]+)','g'))){
        assert.equal(match[1],sha,file + ' ' + name);
      }
    }
    assert.doesNotMatch(content, /uses:\s+actions\/[\w-]+@v\d+/);
  }
});

test('tagged Marketplace consumer runs only on explicit dispatch and uses remote v1.5.1', () => {
  const content = workflow('marketplace-consumer.yml');
  const header = triggerSection(content);
  assert.match(header, /\non:\n  workflow_dispatch:\n/);
  assert.doesNotMatch(header, /\n  (?:push|pull_request|schedule):/);
  assert.match(header, /\npermissions:\n  contents: read/);
  assert.equal((content.match(/uses: dturovskiy\/deus-commit-chart@v1\.5\.1/g) || []).length, 2);
  assert.match(content, /source: local/);
  assert.match(content, /source: github/);
  assert.match(content, /node verify-activity-assets\.js/);
  assert.match(content, /node ci\/live-api-candidate\.js/);
  assert.match(content, /DEUS_COMMIT_CHART_GITHUB_TOKEN: \$\{\{ secrets\.DEUS_COMMIT_CHART_TOKEN \|\| github\.token \}\}/);
  assert.match(content, /python3 ci\/validate-svg\.py/);
  assert.doesNotMatch(content, /upload-artifact|download-artifact|contents: write|git push/);
  assert.match(content, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
});

test('the upcoming Marketplace release version is consistent in npm metadata', () => {
  const pkg = require('../package.json');
  const lock = require('../package-lock.json');
  assert.equal(pkg.version, '1.5.1');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  const changelog = fs.readFileSync(path.join(__dirname, '../CHANGELOG.md'), 'utf8');
  assert.match(changelog, /^## 1\.5\.1$/m);
});
