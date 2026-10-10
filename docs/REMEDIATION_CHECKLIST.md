# Deus Commit Chart — Remediation Checklist

> Status: **initial P0/P1 remediation shipped to main/activity-assets on 2026-10-10; remaining gates open**. Mark an item only with evidence.
> Plan and rationale: [ARCHITECTURE_REMEDIATION_PLAN.md](ARCHITECTURE_REMEDIATION_PLAN.md).
> Repository: `dturovskiy/deus-commit-chart`. No effort estimates or deadlines.
>
> **Rule for marking complete:** evidence (test output, review link, artifact SHA, CI run, or documented decision) must exist. "Implemented" without verification is **not done**.

## Gate 0 — Baseline and prerequisites

- [x] **DC-G0-01** Confirm branch, HEAD, remotes, and existing untracked files before implementation; do not touch unrelated `.tmp-30.svg`. (DEUS MCP git summary and status, 2026-10-10.)
- [x] **DC-G0-02** Restore Node/npm execution in the DEUS MCP environment or select a reproducible alternate runner; record exact command, runtime and outcome.
- [ ] **DC-G0-03** Execute `npm test`, `npm run check`, and the relevant GitHub CI workflow; record failures without masking them.
- [ ] **DC-G0-04** Save reference manifest of existing 30d/90d/365d SVG and HTML, source SHA and latest known publish run.
- [x] **DC-G0-05** Add a fixed-date fixture for 2026-10-09=7, 2026-10-10=3 and replacement 2026-10-10=15; assert last daily point and total delta +12.
- [x] **DC-G0-06** Write down actual source/token visibility assumptions, expected freshness behavior and UTC/calendar-date semantics before editing ingestion logic.

**Gate 0 exit:** `npm test` can actually run, existing behavior is reproducible, and the regression case is executable.

## Gate 1 — Validated contribution snapshot

- [ ] **DC-G1-01** Introduce one versioned `ContributionSnapshot` schema with `schemaVersion`, `snapshotId`, `asOf`, source, calendar range and quality metadata.
- [ ] **DC-G1-02** Separate GitHub GraphQL and local Git source adapters; preserve local offline operation.
- [x] **DC-G1-03** Fetch GitHub data **once** per publish job; freeze the validated snapshot and render all four artifacts from it.
- [x] **DC-G1-04** Inject a fixed clock/`asOf` into date calculation; eliminate independently computed current dates within a build.
- [x] **DC-G1-05** Validate exact expected calendar coverage, monotonic dates, uniqueness, valid ISO dates and nonnegative integer counts; fail on missing/invalid GraphQL data.
- [x] **DC-G1-06** Preserve legitimate zero-activity days, but stop treating absent API dates as real zeros.
- [ ] **DC-G1-07** Test UTC midnight, calendar year boundary, DST transition, leap day and future timestamps; document date/timezone policy.
- [ ] **DC-G1-08** Distinguish GitHub `contributions` from local `commits`; retain any documented compatibility aliases.
- [ ] **DC-G1-09** Explicitly identify incomplete current-day data without reassigning GitHub's recorded calendar dates.
- [x] **DC-G1-10** Create deterministic serialized fixture/snapshot and prove offline repeatability.
- [ ] **DC-G1-11** Review metadata exposed through public HTML/SVG, including restricted/private aggregate fields; no token/private repository names in output.

**Gate 1 exit:** one source snapshot, complete data validation, shared identity for HTML and 30/90/365 outputs.

## Gate 2 — Publication, integrity and failure handling

- [ ] **DC-G2-01** Add bounded GraphQL timeout; classify 401/403, 429, 5xx, network errors and malformed JSON distinctly.
- [x] **DC-G2-02** Implement bounded retry/backoff for transient errors only; do not retry permanent authorization/schema failures.
- [x] **DC-G2-03** Generate build manifest with snapshot ID, `generatedAt`, source SHA, run ID, source details, content hashes and totals for each range.
- [x] **DC-G2-04** Cross-check published HTML/SVG totals and date ranges against the frozen snapshot before allowing publication.
- [x] **DC-G2-05** Validate SVG XML, absence of scripts/remote resources, finite path coordinates and output file completeness.
- [x] **DC-G2-06** Gate publication on validation; a failed fetch/render/validation must preserve previously published good artifacts.
- [x] **DC-G2-07** Decide and implement guarded remote-ref publication; do not retain unconditional force-push without recovery protections.
- [x] **DC-G2-08** Retain immutable build artifacts and previous manifest sufficient to restore an earlier verified release. (Verified test-remote restore from earlier manifest and artifact history; 90-day GitHub build-artifact retention.)
- [x] **DC-G2-09** Rehearse rollback and verify restored content hashes in a nonproduction environment. (Smoke run 38086628526, isolated bare Git remote; manifest and all four assets byte-for-byte matched.)
- [x] **DC-G2-10** Scope `contents: write` and publishing credentials to the minimum necessary permissions; protect secrets from logs.
- [ ] **DC-G2-11** Add freshness health/failure reporting with an explicit configurable policy; separately document profile image-cache limitations.
- [ ] **DC-G2-12** Measure actual GitHub README embed lag and caching behavior; do not claim instantaneous invalidation without evidence.

**Gate 2 exit:** every publication is validated, traceable, recoverable and capable of flagging stale data.

## Gate 3 — Renderer and chart readability

- [ ] **DC-G3-01** Extract shared pure functions for range selection, daily totals, trailing 7-day average, geometry and tick generation.
- [ ] **DC-G3-02** Make static SVG and interactive HTML consume the same normalized snapshot and rendering mathematics.
- [x] **DC-G3-03** Remove or quarantine legacy `renderHtml`/`renderSvg` only after proving old CLI and Action behavior remains supported.
- [x] **DC-G3-04** Decide chart style: discrete daily bars/points + smooth 7d trend (recommended), or explicitly tested daily interpolation. (Chosen daily bars + 7d line; verified on smoke and real GraphQL branch build 2026-10-10.)
- [x] **DC-G3-05** Verify flat sections, spikes, zero days and adjacent extrema without artificial overshoot/false intermediate values.
- [ ] **DC-G3-06** Label `Daily` vs `7d trend`, note incomplete current day, display data freshness in the static SVG.
- [x] **DC-G3-07** Preserve script-free README SVG, self-contained HTML and instant 30/90/365 range switching.
- [ ] **DC-G3-08** Check legibility for 30/90/365 and narrow displays; validate accessible titles/descriptions and color contrast.

**Gate 3 exit:** chart is visually understandable without changing actual daily contribution data.

## Gate 4 — Tests and CI quality gates

- [x] **DC-G4-01** Use a fixed injected clock for all time-dependent tests; repair the January 2026 fixture so its 30d assertion is meaningful.
- [x] **DC-G4-02** Add data invariants and regression tests: 3→15, zero, missing day, duplicate date, invalid count, current-day partial and cumulative delta.
- [ ] **DC-G4-03** Add GraphQL fixtures: success, partial calendar, auth failure, rate limit, transient server error, timeout and visibility differences.
- [x] **DC-G4-04** Assert exactly **one** GitHub API collection per build and one `snapshotId` across all formats.
- [x] **DC-G4-05** Assert exact totals, date ranges, trend values and output metadata for each selected 30/90/365 window.
- [ ] **DC-G4-06** Add SVG golden tests plus XML/path checks; static SVG must not contain executable script or network dependencies.
- [ ] **DC-G4-07** Add HTML/browser-level test of range controls, tooltip values, current-day state and responsive rendering.
- [x] **DC-G4-08** Verify static-vs-interactive numerical parity for the same snapshot.
- [x] **DC-G4-09** Add end-to-end negative publish test: one failed stage leaves the production ref/artifacts unchanged. (Isolated production-like Git remote: corrupt candidate rejected, ref unchanged; actual production never subjected to a failure injection.)
- [x] **DC-G4-10** Require numerical/integrity CI checks before publication; never rely solely on grep/file-existence smoke assertions.
- [x] **DC-G4-11** Confirm local mode continues producing correct results without GitHub credentials or network access.

**Gate 4 exit:** passing checks provide evidence of numerical accuracy, source integrity, display parity and safe failure behavior.

## Gate 5 — Release and handoff

- [ ] **DC-G5-01** Record design decisions on freshness SLA, visibility, time-zone semantics, chart style and publication strategy in the plan or an ADR.
- [ ] **DC-G5-02** Verify one candidate build against a known API response captured with the intended token at the same observation time.
- [x] **DC-G5-03** Verify the published HTML + three SVGs all match the candidate manifest and snapshot ID.
- [ ] **DC-G5-04** Inspect actual README image after publish; record any remaining GitHub caching lag.
- [ ] **DC-G5-05** Review Action permissions, error handling, public-output privacy and compatibility.
- [ ] **DC-G5-06** Update README/CLI/Action docs, troubleshooting runbook and release notes.
- [x] **DC-G5-07** Save the tested rollback command/process and prove it restores a known-good manifest. (ci/rehearse-rollback.sh, docs/OPERATIONS.md, smoke CI run 38086628526.)
- [ ] **DC-G5-08** Close finding IDs **DC-01–DC-15** only with linked evidence, explicit mitigation or accepted risk.

**Gate 5 exit:** maintainable, verifiable release that cannot silently publish known-invalid data.

## Final acceptance contract

- [ ] All output formats use **one** validated snapshot for each build.
- [ ] Missing API data never masquerades as zero activity.
- [ ] A new daily reading can legitimately update 3→15; historical snapshot is not rewritten or misrepresented.
- [ ] Every published artifact exposes or references traceable freshness/snapshot identity.
- [ ] Correct values are independently verified, not inferred from a pretty curve or green CI badge.
- [ ] Errors cannot overwrite the last verified release; rollback has been rehearsed.
- [ ] README SVG remains valid without JS; HTML is self-contained; local Git mode is offline.
- [ ] Security/privacy boundary and source-visibility assumptions are documented.
- [ ] All completion checkmarks have actual evidence links or attached test logs.

## Combo chart review evidence (2026-10-10)

- [Branch smoke](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085045804): SUCCESS for Node regression tests, local composite Action and XML validation.
- [Real GraphQL build](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085049865): SUCCESS for live source, 365-day snapshot, checksums and verified asset retention; publish job SKIPPED on feature branch.
- Verified artifact `97f23f36273600aca81d714ae2c1c224d0dece6ba94d7dce4fe590c167d0884f`: 30d **30 bars**, 90d **89 bars** (one zero day), 365d **293 bars** (remaining days are zero); **one 7-day trend path in each**, no legacy daily curve or filled area. Totals at that moment: 210/771/3056.
- Shared `dailyBarRects()` and `smoothPath()` are used by both static SVG and browser HTML. Bar hit-testing uses day-bin centers. Responsive visual inspection remains open; no visual QA checkbox is inferred from passing unit tests alone.

## Combo chart production verification (2026-10-10)

- [PR #2](https://github.com/dturovskiy/deus-commit-chart/pull/2) merged as `dad9f87308b177acf842e65be6c619862fe27869`.
- [Production build + publish 38085355727](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085355727): SUCCESS for both jobs; [main smoke 38085355677](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085355677): SUCCESS.
- `activity-assets` updated to `042b73d`. Manifest snapshot `182029efbeebcacae06114868c322dd621f385ccd1128fdd4814b514012c1546` (2026-10-10T20:51:11.180Z). Totals: 30d=212, 90d=773, 365d=3058.
- Inspected **published** SVG and HTML via DEUS MCP `git show`: static 30d has 30 bars, 90d 89 bars, 365d 293 bars; each has exactly one 7d trend path, no former daily path or area. Interactive HTML embeds same snapshot ID and totals.
- Production files are verified; GitHub README proxy cache freshness remains a separate, open measurement task. No claim that every screenshot has refreshed instantly.

## Freshness & Recovery implementation evidence (2026-10-10)

- [Smoke 38086628526](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086628526) passed 27/27 tests and logged the expected `Asset checksum mismatch` rejection; the test remote ref remained unchanged.
- The same run successfully rehearsed a forward-only rollback from `d0d03fc24aa594a9aba8c1c02e2a7a2424a5c29a` to a new verified restore commit `7f8d81c16eea8018796982030ad85b2df1f84e1d`; manifest and HTML/30/90/365 SVGs matched the first snapshot byte-for-byte.
- [GraphQL build 38086631846](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086631846) passed on feature branch with publish job skipped.
- Monitor checks the published `activity-assets` tree, not the source repo, with an **8-hour** threshold and deduplicated issue-creation/closure on error/recovery. Issue-delivery/production incident lifecycle and image proxy cache measurements are still open until independently observed.

## Evidence log (fill as work progresses)

| Date / change | Finding or gate | Test / run / SHA / link | Result / notes |
| --- | --- | --- | --- |
| 2026-10-10 baseline | DC-01, DC-02, DC-07 | `activity-assets/index.html`, `publish-pages.yml`, `smoke.yml` | Static analysis + observed snapshot; no fixes applied |
| 2026-10-10 baseline | Gate 0 prerequisite | DEUS MCP `run_task_recipe_async` | Blocked: `package_manager_binary_missing`; tests **not executed** |
| 2026-10-10 CI | Gate 0 / Gates 1–4 | [Smoke run 38082455177](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082455177) and [Smoke run 38083046571](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083046571) | GitHub Actions Node 22: unit/contract/browser VM tests, local Git Action, HTML and SVG 30/90/365 PASS. DEUS MCP `run_gh` was the only remote control tool. |
| 2026-10-10 real GraphQL | DC-01/03/04 | [Verified build 38082860981](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082860981), snapshot `b2b7861480c2199d7b737b9ec982385d056e4b51ae479759243063be5132a5d3` | One GraphQL HTTP request (main + edge aliases) validated 365 dates, generatedAt 20:13:15Z; 10 Oct=22; totals 30d=204, 90d=765, 365d=3050. Four artifact checksums verified, downloadable CI artifact. Publish job SKIPPED on test branch. |
| 2026-10-10 API edge | DC-03/04 | [Failed run 38082697496](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082697496) | Actual GitHub full-year calendar returned 364 dates (2025-10-12..2026-10-10), omitting the boundary Saturday 2025-10-11; fixed by adding a separate short boundary collection alias within the same GraphQL POST. No missing date coerced to zero. |
| 2026-10-10 release guard | Gate 2 | `.github/workflows/publish-pages.yml` and [build 38082860981](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082860981) | Read-only build, manifest, artifact retention, separate write-scoped publish, guarded to main. No production mutation in branch validation. |
| 2026-10-10 host | Gate 0 | DEUS MCP `task_recipe_availability` | Host lacks package manager; GitHub Actions Node 22 is the reproducible test runner triggered via DEUS MCP. |
| 2026-10-10 CI XML | DC-G2-05 | [Smoke 38083228821](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083228821), [GraphQL build 38083244351](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083244351) | Both passed standalone standard-library XML parsing, executable/external resource exclusions, checksum verifier and all ranges. |
| 2026-10-10 PR | Deployment review | [Draft PR #1](https://github.com/dturovskiy/deus-commit-chart/pull/1) | Created using DEUS MCP GitHub CLI, mergeable; PR smoke check SUCCESS. Branch production publish guard was SKIPPED during test run. |
| 2026-10-10 merged | Gate 5 release | [PR #1](https://github.com/dturovskiy/deus-commit-chart/pull/1), `main=7a76e17` | Merged via DEUS MCP gh CLI. Production [Publish 38083440184](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440184) and [Smoke 38083440198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440198) both SUCCESS. |
| 2026-10-10 prod proof | DC-G5-03 | `origin/activity-assets=766cafd`, `manifest.json`, `index.html`, 3 SVGs (DEUS MCP git fetch/show) | Snapshot `abdaa5a4c4ee4194f8fea7ca90e875d871801d0722328e21272773ce9e29afa0`, generated 20:21:46Z, current day 24, 30d=206, 90d=767, 365d=3052; manifest and all 4 outputs agreed; no output truncation. New branch commit parent `b530710`. |
| — | Remaining open gates | [OPERATIONS.md](OPERATIONS.md) | Cache measurements, freshness alerting, public metadata decision, rollback rehearsal and real README image-cache inspection remain open. |
| — | — | — | — |

## Working conventions

1. Mark items as complete only after implementation **and** verification.
2. Maintain the plan's findings register when new issues are discovered.
3. Keep all generated/test artifacts and source changes bounded to the `deus-commit-chart` repository.
4. Do not commit/push/deploy automatically as a side effect of checking boxes; those are separate, reviewable actions.
5. Preserve unrelated working-tree changes and untracked files.
