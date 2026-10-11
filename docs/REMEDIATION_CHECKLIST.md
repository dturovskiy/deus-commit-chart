# Deus Commit Chart — Remediation Checklist

> Status: **initial P0/P1 remediation shipped to main/activity-assets on 2026-10-10; remaining gates open**. Mark an item only with evidence.
> Plan and rationale: [ARCHITECTURE_REMEDIATION_PLAN.md](ARCHITECTURE_REMEDIATION_PLAN.md).
> Repository: `dturovskiy/deus-commit-chart`. No effort estimates or deadlines.
>
> **Rule for marking complete:** evidence (test output, review link, artifact SHA, CI run, or documented decision) must exist. "Implemented" without verification is **not done**.

## Verified checkpoint — 2026-10-11

- **Detailed technical gates: 55/56 checked, 1 open**. G2-10 and G2-12 are now *reviewed operational risk dispositions* (not technical elimination of their residual risks), supported by production/measurement evidence; G3-08 is the only remaining original acceptance gate.
- **Final acceptance assertions: 9/9 checked, 0 open.** Counting both groups: **64/65 checked, 1 open**. G2-10 and G2-12 are closed by an explicit, evidence-backed acceptance decision with outstanding risks retained in the tech-debt register; **G3-08 still requires actual visual review**.
- Security/hygiene: ten GitHub branches tied to merged PRs were deleted; `origin/tag-v1-check`, `main` and `activity-assets` were retained. The [audit](REPO_HYGIENE_AND_SECRETS_AUDIT.md) found no high-confidence credential values across 268 reachable blobs and documented **four historical HTML snapshots containing private contribution breakdown fields**, which cannot be erased by ordinary branch pruning. The PR-only secret guard passed in [Smoke CI #38134694024](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38134694024), scanning 57 tracked files and passing 5 synthetic tests.
- **Remaining original acceptance gate:** G3-08 requires actual visual legibility review (P0). G2-10 and G2-12 are **operationally dispositioned with accepted residuals**, not declared strictly secure or latency-bounded: see [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md) and [TECH_DEBT_REGISTER.md](TECH_DEBT_REGISTER.md). G2-11 remains complete under manual-only monitoring. Current released Action remains `v1.5.1`; signed major alias `v1` still resolves to v1.4.1. Do not add scheduled CI, silently enable `main` protection or rewrite signed tags.

## Post-merge live GraphQL verification — 2026-10-11

- [PR #22](https://github.com/dturovskiy/deus-commit-chart/pull/22) is merged into `main` at `e111dc3`. The final [manual consumer run #38144804210](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38144804210) completed **SUCCESS** on that exact commit. `LIVE_API_CANDIDATE_PASS`: one captured real GraphQL response, `asOf=2026-10-11T13:51:00.646Z`, 365/365 UTC days, 30/90/365 totals 252/815/3115, numerical HTML/SVG/manifest/SHA-256 and safe XML checks. The response/token was not retained. **This closes G5-02; 61/65 gates checked, four remaining.**

## Marketplace v1.5.0 release verification — 2026-10-11

- [PR #13](https://github.com/dturovskiy/deus-commit-chart/pull/13) merged as `8c3919f6f439821849974dd26fc57c158fae2ca7`; [PR Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051) **SUCCESS**: 62/62 Node tests, 9/9 Python tests, PR-only secret scan, offline composite Action, script-free SVG XML and forward-only rollback rehearsal.
- The **new annotated `v1.5.0` tag** points to that exact commit. [Tagged consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039) **SUCCESS**, directly calling `dturovskiy/deus-commit-chart@v1.5.0` for both offline local-Git fixture and authenticated GitHub GraphQL; verified 30/90/365 SVG, HTML, SHA-256 manifest, privacy policy and complete 365-day data.
- [Public GitHub Release `v1.5.0`](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.0) published 2026-10-11 with migration notes. The **signed major `v1` alias was not updated** and remains on v1.4.1. No `main` branch protection or new scheduled CI workflow was enabled.
- The seven newly checked acceptance statements below were already implemented and now have direct test/live-source/release evidence. The *final evidence-audit assertion* remains open; do not claim that every historical checklist checkmark has a matching test or source citation.

## Marketplace-facing README and profile example — 2026-10-11

- [PR #15](https://github.com/dturovskiy/deus-commit-chart/pull/15) merged as `b61509e02f692221c075fe77fa2841968052baba`. [PR-only Smoke #38137972682](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38137972682) **SUCCESS**: 64/64 Node tests, 9/9 Python tests, tracked-file secret guard, real offline Marketplace Action and rollback rehearsal.
- The README description now matches the deployed daily-bar + 7-day-trend renderer; local timestamps are documented as `git log --format=%aI` bucketed into UTC days. The new [profile workflow example](PROFILE_WORKFLOW_EXAMPLE.yml) is **manual-only by default** with an optional daily cron; the tested worktree publisher does not force-push, does not wipe the source checkout, and prevents byte-identical commits. Timestamp-only changes can still generate a commit in that shorter example.
- A real test executes the *exact published example script* with a temporary bare Git remote, checks initial publication, identical no-op, changed counts, preserved `main` and all normal output paths. The Action's public input/output contract and maintainer's scheduled publisher remain unchanged.
- New annotated `v1.5.1` points to `b61509e`; [real tagged consumer #38138078385](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38138078385) **SUCCESS** in both local and live GraphQL modes. [GitHub Release v1.5.1](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.1) published 2026-10-11 as stable. GitHub's default-branch README reflects the new example; public Marketplace/search caches may take time to refresh.
- **Checklist status stays 52/65**. No new technical or acceptance box has been closed by copy edits or an offline Git publishing rehearsal: responsive browser QA, measured profile-image caching and security/permission decisions remain separate evidence requirements.

## GraphQL fixture and SVG golden verification — 2026-10-11

- [PR #17](https://github.com/dturovskiy/deus-commit-chart/pull/17): new fixed-clock, synthetic **GitHub GraphQL fixtures** cover complete/partial calendars, boundary repair, visibility-field minimization, malformed conflicting days, 401/403, 429/503, transient recovery and abort/timeout. Test credentials are synthetic and never read from GitHub.
- Static **SVG goldens**: six pinned full-file SHA-256 hashes (30/90/365 for sparse/spiky dark-spacious and all-zero light-compact calendars), accompanied by exact range-total, snapshot-marker, daily bar/trend, XML/safety and independent manifest assertions. Hashes were obtained from [PR CI #38139132957](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38139132957), then committed as reviewable JSON, with the temporary capture-mode fallback removed. Future intentional visual changes require explicit fixture review.
- No chart runtime, output schema, existing Marketplace tag or schedule changes; `@v1.5.1` remains the latest published release. This closes **G4-03 and G4-06**, but **does not** claim real-browser QA (G4-07), narrow-display visual review (G3-08) or actual README proxy cache measurements (G2-12).

## Real Chromium interaction QA — 2026-10-11

- [PR #19](https://github.com/dturovskiy/deus-commit-chart/pull/19) adds a **real headless Chrome test using Node 22 built-ins** (no Playwright dependency, new job or schedule). The test exercises the produced Action HTML locally and never transmits its content to an external service.
- [Final PR Smoke #38140764234](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38140764234) **SUCCESS**: `REAL_BROWSER_PASS`, 76/76 Node tests, 9/9 Python tests, secret scan, rollback. Real browser evidence: correct default and switched 30/90/365 views, latest-day hover count/trend, mobile 390px layout with contained sideways scrolling, keyboard Enter activation, accessible SVG label and zero external browser HTTP requests.
- **G4-07 complete. G3-08 remains open** pending human inspection of visual legibility across all ranges, styles and viewports; automated DOM assertions and existing WCAG contrast tests do not replace that review.

## Priority-ordered release handoff and technical-debt backlog (not included in 65 gates)

The 65-gate remediation acceptance contract and the living [prioritized technical-debt register](TECH_DEBT_REGISTER.md) track **different** obligations. Adding TD IDs must not inflate the numerator or denominator above. Review each item in priority order:

- [ ] **P0 / DC-G3-08 + TD-02:** complete actual human visual review (30/90/365, both themes, narrow/desktop, GitHub README SVG) against [VISUAL_QA_MATRIX.md](VISUAL_QA_MATRIX.md); record reviewer/screens/browser and any fixes. Automated Chromium/layout/contrast coverage alone does not close the visual acceptance requirement.
- [ ] **P0 / TD-03:** sync latest architecture findings, cache, privacy, operations, security, release policy, README, and evidence index; eliminate contradictory current-state statements; pass PR-only CI.
- [ ] **P0 / TD-01:** only after acceptance, version and test the next exact immutable release and Marketplace install snippet, then separately address the historically signed `v1` alias without a force move or loss of signature.
- [ ] **P1 / DC-G2-10 + TD-04:** explicitly adjudicate and record the lean one-job `contents: write` risk with constraints and review trigger; do not claim strict least privilege or add a second job without authorisation.
- [x] **P1 / DC-G2-12 + TD-05:** GitHub-controlled README caching accepted under the **reviewed alternative measurement criterion**, explicitly without an invalidation SLA. [Run #38146191299](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38146191299) (24.38/40.21/55.63s) and [run #38148744110](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148744110) (99.15/115.00/130.79s) each saw three accurate raw embeds and **no** stale-to-fresh transition/camo. Details and triggers in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md); [TD-05](TECH_DEBT_REGISTER.md) remains open.
- [ ] **P1 deferred / TD-07, TD-08, TD-09:** retain `main` branch-protection decision, historical private-activity metadata constraints and consumer timestamp-only publication noise in the debt register; address based on specified risk triggers rather than increasing CI/runner cost.
- [ ] **P2–P3 deferred / TD-10–TD-13:** pinned upstream Actions runtime migration, function serialization, broader browser compatibility and external cache behaviour. Maintain tests and explicit future triggers.

Current status: **64/65**. G2-10/G2-12 closed as documented operational dispositions rather than code elimination. Release readiness **still pending human visual G3-08**, followed by immutable version/tag consumer and Marketplace checks.

## Gate 0 — Baseline and prerequisites

- [x] **DC-G0-01** Confirm branch, HEAD, remotes, and existing untracked files before implementation; do not touch unrelated `.tmp-30.svg`. (DEUS MCP git summary and status, 2026-10-10.)
- [x] **DC-G0-02** Restore Node/npm execution in the DEUS MCP environment or select a reproducible alternate runner; record exact command, runtime and outcome.
- [x] **DC-G0-03** Execute `npm test`, `npm run check`, and the relevant GitHub CI workflow; record failures without masking them. (Smoke 38088841377: both commands, Python probe, rollback; real GraphQL build 38088845811.)
- [x] **DC-G0-04** Save a reference manifest of existing 30d/90d/365d SVG and HTML, source SHA and publish run. (Captured exact current asset SHA-256 hashes and 365-day totals in [Repository Hygiene and Secrets Audit](REPO_HYGIENE_AND_SECRETS_AUDIT.md), published run 38132248720, on 2026-10-11.)
- [x] **DC-G0-05** Add a fixed-date fixture for 2026-10-09=7, 2026-10-10=3 and replacement 2026-10-10=15; assert last daily point and total delta +12.
- [x] **DC-G0-06** Write down actual source/token visibility assumptions, expected freshness behavior and UTC/calendar-date semantics before editing ingestion logic.

**Gate 0 exit:** `npm test` can actually run, existing behavior is reproducible, and the regression case is executable.

## Gate 1 — Validated contribution snapshot

- [x] **DC-G1-01** Introduce one versioned `ContributionSnapshot` schema with `schemaVersion`, `snapshotId`, `asOf`, source, calendar range and quality metadata. (`contribution-snapshot-model.js`, [contract](CONTRIBUTION_SNAPSHOT_CONTRACT.md), `test/contribution-snapshot-model.test.js` verify immutability, source privacy, trailing-365-day range, local inferred zeros, fail-closed tampering and asset/identity consistency; PR verification required before merge.)
- [x] **DC-G1-02** Separate GitHub GraphQL and local Git source adapters; preserve local offline operation. (2026-10-11: `source-adapters.js` + `local-git-source.js`; smoke 38094293267, live GraphQL 38094296015.)
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

- [x] **DC-G2-01** Add bounded GraphQL timeout; classify 401/403, 429, 5xx, network errors and malformed JSON distinctly. (`GitHubSourceError` with stable code/status/attempts, `test/github-errors.test.js`, smoke 38094293267.)
- [x] **DC-G2-02** Implement bounded retry/backoff for transient errors only; do not retry permanent authorization/schema failures.
- [x] **DC-G2-03** Generate build manifest with snapshot ID, `generatedAt`, source SHA, run ID, source details, content hashes and totals for each range.
- [x] **DC-G2-04** Cross-check published HTML/SVG totals and date ranges against the frozen snapshot before allowing publication.
- [x] **DC-G2-05** Validate SVG XML, absence of scripts/remote resources, finite path coordinates and output file completeness.
- [x] **DC-G2-06** Gate publication on validation; a failed fetch/render/validation must preserve previously published good artifacts.
- [x] **DC-G2-07** Decide and implement guarded remote-ref publication; do not retain unconditional force-push without recovery protections.
- [x] **DC-G2-08** Retain previous verified manifest/artifact versions sufficient to restore an earlier release. (The fast-forward `activity-assets` Git history retains HTML/SVG + manifests, proven by isolated rollback rehearsal. GitHub workflow artifacts were intentionally removed to reduce quota usage.)
- [x] **DC-G2-09** Rehearse rollback and verify restored content hashes in a nonproduction environment. (Smoke run 38086628526, isolated bare Git remote; manifest and all four assets byte-for-byte matched.)
- [x] **DC-G2-10** Scope `contents: write` and publishing credentials to the minimum necessary permissions; protect secrets from logs. (**Accepted release-risk disposition**, not literal job-level least privilege: checkout disables persisted credentials; the final step receives ephemeral `GH_TOKEN` and its credential helper successfully fast-forward pushed on [run #38148635625](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148635625); source/manifest/secret safeguards are verified. **Residual:** trusted single job still holds job-wide write grant and GraphQL fallback can use it. Alternative accepted under existing lean-operation constraints and documented review triggers in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md); [TD-04](TECH_DEBT_REGISTER.md) remains unresolved technical debt.)
- [x] **DC-G2-11** Add freshness health/failure reporting with an explicit configurable policy; separately document profile image-cache limitations. (Manual `monitor-freshness.yml` supports 8/24/48/72-hour thresholds, validates the published manifest/HTML/SVG, fails on malformed/stale data, and uses an `if: always()` summary to report the fetch, integrity and freshness step outcomes even when earlier steps fail. [Post-PR #23 manual run #38145526345](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38145526345) successfully verified the real published snapshot using the 8-hour threshold; `test/freshness.test.js` exercises stale, invalid and missing data with deterministic clocks. **Policy:** diagnostics remain manual-only, no automatic incident issues or scheduled monitors. GitHub profile image caching is independent and documented in `CALENDAR_AND_CACHE_POLICY.md`; G2-12 remains open.)
- [x] **DC-G2-12** Measure actual GitHub README embed lag and caching behavior; do not claim instantaneous invalidation without evidence. (**Accepted alternative measurement criterion:** genuine profile/raw matches after independent publishes have been documented. [Run #38146191299](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38146191299) observed 24.38/40.21/55.63s; [run #38148744110](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148744110) observed 99.15/115.00/130.79s. No stale→fresh transition, independent camo or maximum lag has been measured: **no cache TTL or instant refresh guarantee exists**. Decision in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md), unresolved external risk [TD-05](TECH_DEBT_REGISTER.md).)

**Gate 2 exit:** every publication is validated, traceable, recoverable and capable of flagging stale data.

## Gate 3 — Renderer and chart readability

- [x] **DC-G3-01** Extract shared pure functions for range selection, daily totals, trailing 7-day average, geometry and tick generation. (`activity-metrics.js` provides `dailyTotals`/`trailingMean7` used by the series builder, static SVG and browser-injected script; `modern-renderer.js` shares `selectRange`, `chartGeometry`, `dailyBarRects`, `buildTicks`, `smoothPath`. `test/activity-metrics.test.js` plus preexisting six SVG goldens and independent `chart-contract.js` verifier are the PR gates.)
- [x] **DC-G3-02** Make static SVG and interactive HTML consume the same normalized snapshot and rendering mathematics. (Inline browser embeds canonical renderer range/geometry/ticks functions; 30/90/365 exact bar/path/tick parity passed in smoke 38094293267.)
- [x] **DC-G3-03** Remove or quarantine legacy `renderHtml`/`renderSvg` only after proving old CLI and Action behavior remains supported.
- [x] **DC-G3-04** Decide chart style: discrete daily bars/points + smooth 7d trend (recommended), or explicitly tested daily interpolation. (Chosen daily bars + 7d line; verified on smoke and real GraphQL branch build 2026-10-10.)
- [x] **DC-G3-05** Verify flat sections, spikes, zero days and adjacent extrema without artificial overshoot/false intermediate values.
- [x] **DC-G3-06** Label `Daily` vs `7d trend`, note incomplete current day, display data freshness in the static SVG. (Smoke 38088841377 and live GraphQL 38088845811.)
- [x] **DC-G3-07** Preserve script-free README SVG, self-contained HTML and instant 30/90/365 range switching.
- [ ] **DC-G3-08** Check legibility for 30/90/365 and narrow displays; validate accessible titles/descriptions and color contrast. (Current PR-only Smoke exercises real Chromium in **both** themes at 1280px and 390px, all three ranges; WCAG AA 4.5:1 theme colors and SVG goldens are tested. [User-supplied GitHub screenshots](VISUAL_QA_SCREENSHOT_FINDINGS.md) confirm desktop Marketplace and mobile-profile 30d charts with no obvious clipped data, **but static SVG's tiny date/metadata/legend text on iPhone is a real readability gap**. Light theme, interactive HTML and 90/365 direct device review are not covered by those screenshots. Follow [VISUAL_QA_MATRIX.md](VISUAL_QA_MATRIX.md), remedy/reinspect and record reviewer/device/snapshot before checking this gate.)

**Gate 3 exit:** chart is visually understandable without changing actual daily contribution data.

## Gate 4 — Tests and CI quality gates

- [x] **DC-G4-01** Use a fixed injected clock for all time-dependent tests; repair the January 2026 fixture so its 30d assertion is meaningful.
- [x] **DC-G4-02** Add data invariants and regression tests: 3→15, zero, missing day, duplicate date, invalid count, current-day partial and cumulative delta.
- [x] **DC-G4-03** Add GraphQL fixtures: success, partial calendar, auth failure, rate limit, transient server error, timeout and visibility differences. (`test/graphql-fixtures.test.js`: fixed 365-day calendar, boundary recovery, different restricted-visibility response counts, missing/invalid/contradictory days, 401/403/429/503, network recovery and bounded timeout; [PR #17](https://github.com/dturovskiy/deus-commit-chart/pull/17).)
- [x] **DC-G4-04** Assert exactly **one** GitHub API collection per build and one `snapshotId` across all formats.
- [x] **DC-G4-05** Assert exact totals, date ranges, trend values and output metadata for each selected 30/90/365 window.
- [x] **DC-G4-06** Add SVG golden tests plus XML/path checks; static SVG must not contain executable script or network dependencies. (`test/svg-golden.test.js` + checked-in `test/svg-golden.json`: six full-content SHA-256 baselines for 30/90/365-day spikes/dark/spacious and zero/light/compact, deterministic UTC fixtures; independently enforced by `ci/validate-svg.py` and manifest SHA checks; [PR #17](https://github.com/dturovskiy/deus-commit-chart/pull/17).)
- [x] **DC-G4-07** Add HTML/browser-level test of range controls, tooltip values, current-day state and responsive rendering. (`ci/browser-smoke.js` runs actual headless Chromium in the existing PR-only Smoke job; [run #38140764234](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38140764234) SUCCESS: desktop 30/90/365, current-day tooltip, keyboard Enter, real mobile 390px layout/scroll, no page overflow, no external HTTP. Existing `test/browser.test.js` VM parity remains independent.)
- [x] **DC-G4-08** Verify static-vs-interactive numerical parity for the same snapshot.
- [x] **DC-G4-09** Add end-to-end negative publish test: one failed stage leaves the production ref/artifacts unchanged. (Isolated production-like Git remote: corrupt candidate rejected, ref unchanged; actual production never subjected to a failure injection.)
- [x] **DC-G4-10** Require numerical/integrity CI checks before publication; never rely solely on grep/file-existence smoke assertions.
- [x] **DC-G4-11** Confirm local mode continues producing correct results without GitHub credentials or network access.

**Gate 4 exit:** passing checks provide evidence of numerical accuracy, source integrity, display parity and safe failure behavior.

## Gate 5 — Release and handoff

- [x] **DC-G5-01** Record design decisions on freshness SLA, visibility, time-zone semantics, chart style and publication strategy in the plan or an ADR. (docs/CALENDAR_AND_CACHE_POLICY.md, PRIVACY.md, docs/OPERATIONS.md, architecture plan.)
- [x] **DC-G5-02** Verify one candidate build against a known API response captured with the intended token at the same observation time. ([PR #22](https://github.com/dturovskiy/deus-commit-chart/pull/22) squash-merged as `e111dc3` after [PR-only Smoke #38142253198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38142253198) succeeded with 82/82 Node + 9/9 Python tests; the [post-merge manual consumer #38144804210](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38144804210) ran at `main=e111dc3` and printed `LIVE_API_CANDIDATE_PASS` with captured `asOf=2026-10-11T13:51:00.646Z`, 365/365 UTC days and exact 30/90/365 totals of 252/815/3115. The GraphQL reply and credential were never retained as artifacts.)
- [x] **DC-G5-03** Verify the published HTML + three SVGs all match the candidate manifest and snapshot ID.
- [x] **DC-G5-04** Inspect actual README image after publish; record any remaining GitHub caching lag. (After [production publish #38141334818](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38141334818), [manual cache audit #38141361309](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38141361309) parsed the actual GitHub profile HTML, fetched its embedded `raw.githubusercontent.com` SVG and independently matched its snapshot to the production manifest 25.72 seconds after generation; `Cache-Control: max-age=300`. No stale transition or independent camo cache observed; **G2-12 remains open**.)
- [x] **DC-G5-05** Review Action permissions, error handling, public-output privacy and compatibility. (docs/CI_ACTION_SECURITY_REVIEW.md; smoke 38094293267, published build 38094426663. Upstream Action SHA pinning remains OPEN as separate P2 hardening.)
- [x] **DC-G5-06** Update README/CLI/Action docs, troubleshooting runbook and release notes. ([PR #13](https://github.com/dturovskiy/deus-commit-chart/pull/13), [v1.5.0 release notes](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.0), [Marketplace release policy](MARKETPLACE_RELEASE_POLICY.md), [Operations](OPERATIONS.md); [PR Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051) and [tagged consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039) SUCCESS.)
- [x] **DC-G5-07** Save the tested rollback command/process and prove it restores a known-good manifest. (ci/rehearse-rollback.sh, docs/OPERATIONS.md, smoke CI run 38086628526.)
- [x] **DC-G5-08** Close finding IDs **DC-01–DC-15** only with linked evidence, explicit mitigation or accepted risk. ([FINDINGS_DISPOSITION.md](FINDINGS_DISPOSITION.md): 15 individually reviewed dispositions with implementation/CI links and explicitly accepted residual risks for automated monitoring, write-scoped publisher, historic chart metadata and README caching.)

**Gate 5 exit:** maintainable, verifiable release that cannot silently publish known-invalid data.

## Final acceptance contract

- [x] All output formats use **one** validated snapshot for each build. (Shared builder/identity tests, [PR Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051), [real tagged consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039), verifying four artifacts.)
- [x] Missing API data never masquerades as zero activity. (`assertCalendar` rejects missing/duplicate/invalid days; [actual boundary-day failure #38082697496](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082697496) fixed with boundary alias; [PR Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051).)
- [x] A new daily reading can legitimately update 3→15; historical snapshot is not rewritten or misrepresented. (Frozen fixture in `test/snapshot.test.js`, [PR Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051); immutable snapshot IDs preserve historical data.)
- [x] Every published artifact exposes or references traceable freshness/snapshot identity. (Manifest `generatedAt`/`snapshotId`, SVG snapshot marker and HTML metadata cross-checked against [production snapshot #38132248720](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38132248720) and [consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039).)
- [x] Correct values are independently verified, not inferred from a pretty curve or green CI badge. (`verify-activity-assets.js` independently re-derives 365-day numerical series, SHA-256 digests and all three SVG range totals; actually exercised with live GitHub source in [tagged consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039).)
- [x] Errors cannot overwrite the last verified release; rollback has been rehearsed. (Publication validates before guarded fast-forward push; isolated corrupted-candidate rejection and restoration in [Smoke #38135342051](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135342051). **No corrupt-input injection into the real production branch**.)
- [x] README SVG remains valid without JS; HTML is self-contained; local Git mode is offline. (SVG XML/safety tests, browser VM consistency tests and separate offline local Git fixture executed against **actual `@v1.5.0` remote Action** in [consumer #38135440039](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38135440039).)
- [x] Security/privacy boundary and source-visibility assumptions are documented. (PR #4, README/PRIVACY.md/SECURITY.md/OPERATIONS.md; historical artifacts may still contain prior metadata.)
- [x] All completion checkmarks have actual evidence links or attached test logs. ([CHECKLIST_EVIDENCE_INDEX.md](CHECKLIST_EVIDENCE_INDEX.md) maps checked technical gates to tests, runs and explicit reviewed risk decisions; G2-10/G2-12 have operational **disposition** evidence in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md), not proof of strict permission isolation or a cache TTL. All nine final acceptance assertions are also mapped.)

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

## Corrected profile cache classification — production verification

- [PR #6](https://github.com/dturovskiy/deus-commit-chart/pull/6) merged as `3c6f08037993e5734a8faf8b9e3c05b2062b5b3a`. [Smoke 38089180747](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38089180747) passed, including **4 offline cache classification tests**. [Publish 38089214515](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38089214515) succeeded.
- [Real audit 38089253244](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38089253244) returned **`profile_raw_matched`**, `independentImageProxyObserved=false`, and `snapshotAgeAtProbeSeconds=36.77`. Published manifest snapshot `c149a3bfb6693f78e7f442f8d902bb2fdc683a2f4ad3eeb4a9396c519b77e70c`, `generatedAt=2026-10-10T21:51:30.309Z`, 30/90/365 totals **227/788/3073**. Raw/profile image matched; profile link host raw.githubusercontent.com, not camo; raw SVG `Cache-Control: max-age=300`.
- **Do not close** DC-G2-12 / DC-G5-04 based only on these two successful raw-embed observations: no stale-to-fresh transition, cache invalidation upper bound, independent camo proxy observation, or manual device/browser image-cache inspection has been demonstrated.

## Source adapter and shared geometry refactor (2026-10-11)

- [Smoke run 38094293267](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094293267): **SUCCESS**, 49/49 Node tests (both `npm run check` and `npm test`), 4/4 Python cache tests, composite Action, local offline CLI, negative publish and forward-only rollback rehearsal.
- [Live GraphQL candidate 38094296015](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094296015): **SUCCESS**; publication SKIPPED on test branch.
- New `source-adapters.js` routes CLI + publisher through one frozen clock. `local-git-source.js` is offline and enforces 20s/16MiB git subprocess bounds and option-like ref rejection. Compatibility exports remain available.
- Browser HTML now embeds the canonical renderer's `selectRange`, `chartGeometry`, `smoothPath`, `dailyBarRects`, `buildTicks` and date helpers. The browser execution test compares exact bars, blue trend path and tick text against static SVG for 30/90/365 days.
- GitHub HTTP/auth/rate-limit/server/GraphQL/JSON/network/timeout errors have stable classifications with bounded retry behavior; actual malformed live API conditions are not deliberately injected into production.
- Architectural contract documented in [SOURCE_AND_RENDER_ARCHITECTURE.md](SOURCE_AND_RENDER_ARCHITECTURE.md). **DC-G3-01 remains partially open:** independent metric helpers and end-to-end tick policy need further explicit extraction/tests. No visual redesign or browser mobile changes.

## Source/render architecture — production verification (2026-10-11)

- [PR #7](https://github.com/dturovskiy/deus-commit-chart/pull/7) merged as `ab272c1d50e72e7bce01b3609100399fbdb7936e`.
- [Main smoke 38094426657](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094426657) **SUCCESS**. [Production publish 38094426663](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094426663): build and publish both **SUCCESS**; [post-deploy health 38094479108](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094479108) **SUCCESS**.
- Published `activity-assets` manifest: `sourceCommit=ab272c1`, `workflowRun=38094426663`, snapshot `5e236808b8452d099416b06c3ab71e391457610690be0118f7dfe1b909dc61f6`, generated `2026-10-10T23:16:12.605Z`, 30d=228, 90d=789, 365d=3074. Checked `manifest.json`, `index.html` and 30d SVG directly from the remote with no truncated responses. HTML uses canonical pure renderer functions and the published SVG has daily bars and one trend path.
- [CI/Action security review](CI_ACTION_SECURITY_REVIEW.md) documents the original two-job credential separation. **Later policy:** one trusted main-only write-capable publisher was explicitly accepted for reduced CI cost, and external `actions/checkout`/`setup-node` are SHA-pinned as verified by PR #11. Complete least-privilege separation remains OPEN (G2-10).
- **Still open:** full G3-01 extraction of metrics/tick policy into a separate, independently tested pure package, longitudinal GitHub cache measurements and real-browser visual QA. Do not mark these complete based solely on this refactor.

## Lean PR-only CI and six-hour publishing policy (2026-10-11)

- Decision: **only pull requests targeting `main` trigger Smoke CI**. No push/cron CI, and no regression tests inside the publisher.
- Publication is the **sole scheduled workflow**, every six hours (`17 */6 * * *`), in one `main`-guarded job: GraphQL → generated HTML/SVG/manifest → checksum/numerical validation → SVG XML validation → fast-forward `activity-assets`. No `npm ci`, test suite, artifact upload/download, or extra runner job.
- `monitor-freshness.yml` and `audit-readme-cache.yml` are manual-only; there is no scheduled monitor/cache probe, no new automatic incident issues and no cache-audit artifact upload. The existing `action.yml` Marketplace API is unchanged.
- `test/workflow-policy.test.js` enforces these trigger, storage and publish-policy invariants. PR CI and one production manual publish must pass before claiming this configuration is verified. Earlier logged successful runs are historical and not evidence for this new policy.

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
