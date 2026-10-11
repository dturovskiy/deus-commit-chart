'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = filename => fs.readFileSync(path.join(__dirname,'..',filename),'utf8');

test('prioritized debt has unique IDs, explicit release gates and separate counts', () => {
  const register = read('docs/TECH_DEBT_REGISTER.md');
  const matches = [...register.matchAll(/\*\*TD-(\d{2})\b/g)].map(m=>m[1]);
  assert.deepEqual(matches, Array.from({length:13},(_,i)=>String(i+1).padStart(2,'0')));
  assert.match(register,/## P0/);
  assert.match(register,/## P1/);
  assert.match(register,/## P2 \/ P3/);
  assert.match(register,/revisit/i);
  assert.match(register,/65-item remediation acceptance contract/);
});

test('checklist retains actual evidence-backed denominator, not merged debt count', () => {
  const checklist = read('docs/REMEDIATION_CHECKLIST.md');
  const checks = [...checklist.matchAll(/^- \[([x ])\] \*\*DC-G\d-\d\d\*\*/gm)];
  assert.equal(checks.length,56);
  const checked=checks.filter(m=>m[1]==='x').length;
  const technical=/Detailed technical gates: (\d+)\/56 checked/.exec(checklist);
  const complete=/Counting both groups: \*\*(\d+)\/65 checked/.exec(checklist);
  assert.ok(technical && complete,'Checklist headline must declare checked counts');
  assert.equal(Number(technical[1]),checked);
  assert.equal(Number(complete[1]),checked+9);
  const openIds=[...checklist.matchAll(/^- \[ \] \*\*(DC-G\d-\d\d)\*\*/gm)].map(m=>m[1]);
  const debt=read('docs/TECH_DEBT_REGISTER.md');
  for (const id of openIds) {
    assert.ok(debt.includes(id),'Open remediation gate missing debt entry: '+id);
  }
  assert.match(checklist,/TECH_DEBT_REGISTER\.md/);
  assert.match(checklist,/VISUAL_QA_MATRIX\.md/);
});

test('documentation does not claim old alias or manual cache SLA was fixed', () => {
  const debt=read('docs/TECH_DEBT_REGISTER.md');
  assert.match(debt,/signed legacy.*v1/);
  assert.match(debt,/zero observed stale-to-fresh transitions/);
  const qa=read('docs/VISUAL_QA_MATRIX.md');
  assert.match(qa,/final human sign-off pending/);
  assert.match(qa,/VISUAL_QA_SCREENSHOT_FINDINGS\.md/);
  assert.match(qa,/Chromium/);
});
