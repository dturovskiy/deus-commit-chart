# Deus Commit Chart — Remediation Checklist

> Status: **initial P0/P1 remediation shipped to main/activity-assets on 2026-10-10; remaining gates open**. Mark an item only with evidence.
> Plan and rationale: [ARCHITECTURE_REMEDIATION_PLAN.md](ARCHITECTURE_REMEDIATION_PLAN.md).
> Repository: `dturovskiy/deus-commit-chart`. No effort estimates or deadlines.
>
> **Rule for marking complete:** evidence (test output, review link, artifact SHA, CI run, or documented decision) must exist. "Implemented" without verification is **not done**.

## Gate 0 — Baseline and prerequisites

- [x] **DC-G0-01** Confirm branch, HEAD, remotes, and existing untracked files before implementation; do not touch unrelated `.tmp-30.svg`. (DEUS MCP git summary and status, 2026-10-10.)
- [x] **DC-G0-02** Restore Node/npm execution in the DEUS MCP environment or select a reproducible alternate runner; record exact command, runtime and outcome.
- [x] **DC-G0-03** Execute `npm test`, `npm run check`, and the relevant GitHub CI workflow; record failures without masking them. (Smoke 38088841377: both commands, Python probe, rollback; real GraphQL build 38088845811.)
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
- [x] **DC-G1-07** Test UTC midnight, calendar year boundary, DST transition, leap day and future timestamps; document date/timezone policy. (CI 38088841377; docs/CALENDAR_AND_CACHE_POLICY.md.)
- [x] **DC-G1-08** Distinguish GitHub `contributions` from local `commits`; retain any documented compatibility aliases. (CI 38088841377 and tested SVG/HTML dynamic labels; legacy `totalCommits` metadata alias retained.)
- [x] **DC-G1-09** Explicitly identify incomplete current-day data without reassigning GitHub's recorded calendar dates. (`Today partial` in README SVG and HTML, original GitHub dates preserved; CI 38088841377.)
- [x] **DC-G1-10** Create deterministic serialized fixture/snapshot and prove offline repeatability.
- [x] **DC-G1-11** Review metadata exposed through public HTML/SVG, including restricted/private aggregate fields; no token/private repository names in output. (Public-data policy daily-aggregates-only-v1; production PR #4 and run 38087609571 verified; history limitations documented.)

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
- [x] **DC-G2-11** Add freshness health/failure reporting with an explicit configurable policy; separately document profile image-cache limitations. (Scheduled health workflow; tested failure policy in 27-test suite; production healthy-run 38086854207. Live incident notification delivery remains untested.)
- [ ] **DC-G2-12** Measure actual GitHub README embed lag and caching behavior; do not claim instantaneous invalidation without evidence.

**Gate 2 exit:** every publication is validated, traceable, recoverable and capable of flagging stale data.

## Gate 3 — Renderer and chart readability

- [ ] **DC-G3-01** Extract shared pure functions for range selection, daily totals, trailing 7-day average, geometry and tick generation.
- [ ] **DC-G3-02** Make static SVG and interactive HTML consume the same normalized snapshot and rendering mathematics.
- [x] **DC-G3-03** Remove or quarantine legacy `renderHtml`/`renderSvg` only after proving old CLI and Action behavior remains supported.
- [x] **DC-G3-04** Decide chart style: discrete daily bars/points + smooth 7d trend (recommended), or explicitly tested daily interpolation. (Chosen daily bars + 7d line; verified on smoke and real GraphQL branch build 2026-10-10.)
- [x] **DC-G3-05** Verify flat sections, spikes, zero days and adjacent extrema without artificial overshoot/false intermediate values.
- [x] **DC-G3-06** Label `Daily` vs `7d trend`, note incomplete current day, display data freshness in the static SVG. (Smoke 38088841377 and live GraphQL 38088845811.)
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

- [x] **DC-G5-01** Record design decisions on freshness SLA, visibility, time-zone semantics, chart style and publication strategy in the plan or an ADR. (docs/CALENDAR_AND_CACHE_POLICY.md, PRIVACY.md, docs/OPERATIONS.md, architecture plan.)
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
- [x] Security/privacy boundary and source-visibility assumptions are documented. (PR #4, README/PRIVACY.md/SECURITY.md/OPERATIONS.md; historical artifacts may still contain prior metadata.)
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

## Production Freshness & Recovery verification (2026-10-10)

- [PR #3](https://github.com/dturovskiy/deus-commit-chart/pull/3) merged as `de1b8c8495d46b4a919c3c21c191a94079005fd6`.
- [Production publish 38086821217](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821217) **SUCCESS**, [main smoke 38086821198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821198) **SUCCESS**.
- [Real health monitor 38086854207](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086854207) **SUCCESS**: verified published manifest + all four artifact checksums and numerical totals + three SVG XML files; snapshot `f802e610b1d2d6abac963700adc140672c9c250b48ff0f29e9abda173f361195`, generated `2026-10-10T21:14:08.878Z`, age `0.00823h` (approx. 30s) at the check, threshold 8h.
- GitHub Issues are enabled and no open issues existed at healthy-run time. Actual incident-creation/notification on a production failure was **not intentionally triggered**.
- QA only: [branch smoke 38086628526](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086628526) proved corrupt candidate rejected without test-remote ref mutation and full forward-only manifest/asset restoration. GitHub image-proxy freshness remains an independent open task.

## Public chart privacy audit — production evidence (2026-10-10)

- [PR #4](https://github.com/dturovskiy/deus-commit-chart/pull/4) merged as `20e065eee7e71b0a04b4030d90832d71ba6b9d99`; [production publish 38087609571](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38087609571) **SUCCESS**; [main smoke 38087609597](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38087609597) **SUCCESS**.
- [Branch smoke 38087484385](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38087484385): **31/31 tests passed**; includes GraphQL private-field absence, redacted HTML/SVG/manifest fixtures, a malicious public-metadata injection with a recomputed checksum rejected by the verifier, and rollback rehearsal.
- [Real GraphQL canary build 38087488714](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38087488714): **SUCCESS** with publish skipped. Artifact meta contained only explicitly allowed keys, never `restrictedContributionsCount`, `hasAnyRestrictedContributions`, or `totalCommitContributions`.
- Production `activity-assets` manifest: policy `daily-aggregates-only-v1`, snapshot `809d1f6975f7a37866ecf83a824fce742b437e6a6fd305b4ea7caec83eca9a10`, generated `2026-10-10T21:26:13.288Z`, ranges **219/780/3065** contributions. Published HTML and all three SVGs are free of the restricted-count metadata; the HTML preserves 365 daily values, including **37** for Oct 10 at that timestamp.
- [Production freshness monitor 38087690459](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38087690459): **SUCCESS** against this release.
- **Privacy limitation:** chart daily aggregates may include token-visible private activity. Historical Git objects, GitHub Actions artifacts, forks, and image caches can retain older metadata; no destructive history rewrite was attempted.

## UTC contract, mobile layout and README cache audit (2026-10-10)

- [PR #5](https://github.com/dturovskiy/deus-commit-chart/pull/5) merged as `69294b756645f8cbd3271cd642c015de42855917`; [production publish 38088912319](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088912319) and [main smoke 38088912320](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088912320) SUCCESS.
- [Feature smoke 38088841377](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088841377): `npm run check`, `npm test` and 3 offline Python probe tests passed; the run includes UTC midnight, leap-day, year boundary, DST, future commit, cross-timezone determinism, source-unit labels and mobile DOM/CSS tests.
- [GraphQL candidate 38088845811](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088845811): live API build SUCCESS, publish SKIPPED on review branch.
- New `chart-contract.js` validates the 365-day series, running totals, trailing seven-day mean, UTC end date and recomputed SHA-256 snapshot identity in both the builder and independent verifier.
- **First read-only cache observation:** [run 38088946652](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088946652). Published generatedAt `2026-10-10T21:46:45.145Z`, observed `21:47:13.611536Z` (**28.47s** later), full snapshot `c62df1c12e738534be893db36a91865813f50ba2e2d0443778ed00e3825f86a9`. GitHub profile HTML exposed **raw.githubusercontent.com** image source; the direct raw asset and profile image URL matched the published snapshot. Both responses advertised `Cache-Control: max-age=300`. **No independent camo cache was observed.** This sample cannot establish an upper bound on browser/proxy invalidation. Classification was subsequently refined to avoid labelling a raw embed as a camo proxy.
- **Not closed:** repeated longitudinal cache-lag measurements, physical device/browser visual review for narrow-screen readability, and actual browser/proxy cache behavior under a demonstrably stale image.

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
| — | Current open gates | [OPERATIONS.md](OPERATIONS.md) | Image-proxy cache measurements, full public metadata policy, responsive visual QA, and live incident notification delivery remain open. Rehearsed rollback and published-asset freshness checks are evidenced above. |
| — | — | — | — |

## Working conventions

1. Mark items as complete only after implementation **and** verification.
2. Maintain the plan's findings register when new issues are discovered.
3. Keep all generated/test artifacts and source changes bounded to the `deus-commit-chart` repository.
4. Do not commit/push/deploy automatically as a side effect of checking boxes; those are separate, reviewable actions.
5. Preserve unrelated working-tree changes and untracked files.
