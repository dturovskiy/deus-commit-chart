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
  assert.match(monitor, /CHART_MAX_AGE_HOURS: '24'/);
});

test('Marketplace composite Action entry point remains unchanged in the runtime pipeline', () => {
  const action = fs.readFileSync(path.join(__dirname, '../action.yml'), 'utf8');
  assert.match(action, /runs:\n  using: composite/);
  assert.match(action, /node "\$GITHUB_ACTION_PATH\/build-activity-assets\.js"/);
  assert.match(action, /node "\$GITHUB_ACTION_PATH\/verify-activity-assets\.js"/);
  assert.match(action, /source: github or local|Data source: github or local/);
});
