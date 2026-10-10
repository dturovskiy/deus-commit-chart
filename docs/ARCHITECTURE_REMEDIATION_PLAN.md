# Deus Commit Chart — Architecture Remediation Plan

> Status: **initial P0/P1 remediation released to production; follow-up gates remain open**
> Date: **2026-10-10**
> Repository: `dturovskiy/deus-commit-chart` (`main`)
> Companion execution checklist: [REMEDIATION_CHECKLIST.md](REMEDIATION_CHECKLIST.md)
> Principle: **one validated snapshot → deterministic renderers → verified publication**.

## 1. Purpose and boundaries

Fix correctness, data freshness, release reliability, and readability of the 30/90/365-day GitHub contribution charts without replacing the product. This document is a persistent engineering plan, **not evidence that fixes have been made**. No effort estimates or deadlines are assigned.

In scope: GitHub GraphQL adapter, local Git adapter contracts, time/date semantics, chart data model, SVG/HTML rendering, test fixtures, GitHub Actions publication, monitoring/freshness, security/privacy boundary, and README embedding.

Preserve:
- Static, script-free GitHub README SVGs; self-contained, dependency-free-at-runtime interactive HTML.
- 30/90/365-day selection, local offline Git mode, GitHub contribution-calendar semantics, accessibility, existing CLI/Action public inputs where feasible.
- Separation of reusable Action (generate) from caller-controlled publication.
- No mandatory server, external chart endpoint, telemetry service, or database.

Not in scope: creating new dashboards, real-time backend, changing GitHub's contribution-count rules, exposing private repository names, or altering unrelated DEUS projects.

## 2. Evidence baseline

Inspected through DEUS MCP: `generate-commit-chart.js`, `modern-renderer.js`, `test/generator.test.js`, `action.yml`, `.github/workflows/{smoke,publish-pages}.yml`, `README.md`, and profile `dturovskiy/README.md`. Compared with published `activity-assets/index.html` and `activity-30d.svg` on **2026-10-10**.

- Published HTML snapshot: `generatedAt=2026-10-10T12:35:17.431Z`, 2026-10-09: **7**, 2026-10-10: **3**, trailing 365-day sum: **3031**, trailing 30-day sum: **185**.
- User's later GitHub screenshot: **15** contributions on 2026-10-10 and **3043** over the year. The **12**-contribution difference is consistent with snapshot age; this does **not** prove the GraphQL API returned incorrect counts. Fresh data comparison must account for observation time, permissions, and GitHub processing delay.
- At audit, latest confirmed publisher run was successful: `https://github.com/dturovskiy/deus-commit-chart/actions/runs/38052498196`.
- The profile README embeds a **mutable** URL: `https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg`. GitHub's image caching may add additional delay; actual cache TTL and invalidation behavior are **not verified**.
- Test run via DEUS MCP was **blocked** by `package_manager_binary_missing`; do not label current tests as locally passing. Git status before this documentation task: only unrelated untracked `.tmp-30.svg` (empty); leave it untouched.

## 3. Findings register

Severity reflects product impact, not an independently proven security vulnerability. **Confirmed** means supported by code/observed artifact; **risk** requires a targeted reproduction or operational measurement.

| ID | Priority | Status | Finding / location | Consequence |
| --- | --- | --- | --- | --- |
| DC-01 | P0 | Confirmed | Publisher executes generator once for HTML and three times for SVG; each invokes GraphQL (`publish-pages.yml`, `readGithubDailyCounts`). | Artifacts in one publication can contain differing data/as-of times. |
| DC-02 | P0 | Confirmed | SVG omits `generatedAt`/freshness status, mutable image URL and scheduled-only refresh. | Stale values appear current; cached README may lag further. |
| DC-03 | P1 | Confirmed | `buildSeries` maps missing dates to zero via `counts.get(date) || 0` without source validation. | Partial GraphQL calendars cannot be distinguished from zero activity. |
| DC-04 | P1 | Risk | UTC day boundaries for GraphQL/local; multiple generator invocations each use their own clock. | Midnight transitions and timezone differences may shift the range. |
| DC-05 | P1 | Confirmed | GraphQL `fetch` has no explicit timeout, bounded retry, or rate-limit classification (`generate-commit-chart.js:186-269`). | Transient API errors block refresh without a useful freshness signal. |
| DC-06 | P1 | Confirmed | Publish uses `git switch --orphan` and unconditional `git push --force` without persisted release manifest/verified rollback. | Historical artifacts and a reproducible rollback path are unavailable in the published branch. |
| DC-07 | P1 | Confirmed | Smoke fixtures use January 2026 commits while ranges roll with wall-clock time; asserts mostly check file presence/markup. | The 30-day smoke case can succeed with all-zero daily activity. |
| DC-08 | P1 | Confirmed | Graph geometry, selection, smoothing and labels are duplicated in server JS and embedded browser script (`modern-renderer.js`). | HTML/SVG implementations can drift. |
| DC-09 | P2 | Confirmed | Clamped Bézier `smoothPath` represents irregular **daily** counts as a smooth curve. | Sharp transitions and visual ambiguity; not necessarily a numerical bug. |
| DC-10 | P2 | Confirmed | Legacy `renderHtml`/`renderSvg` remain in `generate-commit-chart.js`, while `main()` and module exports use `modern-renderer.js`. | Two apparent rendering implementations increase maintenance risk. |
| DC-11 | P2 | Risk | Local `git log --date=short` depends on date interpretation; `endDate` may extend to a future-dated commit and `startDate` far beyond 365 days. | Unbounded/misaligned windows and misleading local statistics. |
| DC-12 | P2 | Confirmed | Domain fields name all GraphQL contributions `commits`; embedded metadata includes restricted/private aggregate counts when permitted. | Semantic confusion and need for an explicit public-output privacy contract. |
| DC-13 | P1 | Confirmed | Smoke and publish run independently on `main`; publish has no explicit gate based on comprehensive validation. | A successful publish does not prove numerical correctness or visual parity. |
| DC-14 | P2 | Risk | Publish workflow has workflow-scoped `contents: write` and uses actions by floating major tags. | Opportunity for least-privilege and supply-chain hardening; no compromise established. |
| DC-15 | P2 | Confirmed | No standalone structured build manifest, snapshot ID, data-quality report, or freshness health check. | Hard to correlate chart, source, workflow run and version. |

### Key semantics (do not accidentally change)

- **Daily** is the contribution count on that calendar day; it may decline relative to yesterday even when the year's cumulative contributions rise. **7d trend** is a trailing 7-day average; it also may decline.
- GitHub `contributionCount` is **not** the number of commits in a single repository. The GitHub adapter and local Git adapter intentionally have different source semantics.
- The current day is incomplete. If an hourly/later sample changes from 3 to 15, the chart must reflect the new point after publication, but an immutable earlier snapshot remains historically valid.
- Never fabricate 15 from the screenshot: validate against a fresh GitHub API response under the intended token at the time of rebuild.

## 4. Target data contract and pipeline

```text
GitHub GraphQL / local Git
    → source adapter (single fetch + diagnostics)
    → validated ContributionSnapshot v1 (immutable in build)
    → pure series, range, trend and geometry functions
    → SVG-30d, SVG-90d, SVG-365d, HTML
    → cross-artifact validation + manifest + retained build evidence
    → guarded publish → activity-assets → profile README
                               ↘ freshness / failure reporting
```

Proposed normalized model, illustrative (exact JSON schema is a Gate 1 deliverable):

```json
{
  "schemaVersion": 1,
  "snapshotId": "<deterministic-hash-of-canonical-data-and-source-metadata>",
  "source": "github",
  "account": "dturovskiy",
  "calendarTimezone": "<documented-GitHub-date-contract>",
  "asOf": "2026-10-10T12:35:17.431Z",
  "retrievedAt": "2026-10-10T12:35:17.431Z",
  "startDate": "2025-10-11",
  "endDate": "2026-10-10",
  "currentDayPartial": true,
  "days": [{ "date": "2026-10-10", "contributions": 3 }],
  "quality": { "complete": true, "missingDates": [] }
}
```

This is **not** a full 365-day sample, only a shape. Decide separately which metadata is embedded in public HTML/SVG; no token, private repository identity, or raw GraphQL response must enter published artifacts. Consider redacting restricted-contribution metadata by default.

Required invariants:
1. **One source read** per build and exactly one validated, frozen snapshot for all four outputs.
2. Consecutive, unique ISO dates, finite nonnegative integer counts, expected window length and explicit clock/date policy. Incomplete API response means **error**, not zeros.
3. Same `snapshotId`, source date range, underlying totals and per-day values in HTML and all SVGs (within each range).
4. Deterministic rendering from a fixed snapshot, with stable SVG/HTML output except clearly isolated build metadata.
5. `currentDayPartial` and last successful retrieval clearly distinguish *today* from finalized past days.
6. A failed build **never overwrites** a previously validated publication. Stale old assets are shown as stale/flagged via independent monitoring; no claim of guaranteed instant README cache invalidation.
7. A published release has verifiable manifest, content hashes, workflow run ID/source SHA, and rollback procedure.

## 5. Implementation gates

### Gate 0 — Reproducible baseline
- Restore working Node/npm tooling for the project runner; verify actual `npm test` and CI parity. Treat missing runtime as an environment prerequisite, not as a chart-code failure.
- Capture actual artifacts, recent GitHub Action run, current README image endpoint and Git status without modifying unrelated files.
- Add fixed-clock regression data: previous day 7, current day 3, later 15; cover changes in total and 7-day average.
- Record snapshot permission/visibility assumptions and date policy decisions.
**Exit:** baseline evidence reproducible and test environment operational.

### Gate 1 — Source and domain correctness
- Implement source adapters and a single `loadContributionSnapshot()` invocation; decouple collection from rendering.
- Inject clock/`asOf` rather than calling `new Date()` independently. Align GitHub calendar dates with documented source behavior; test UTC midnight, DST transitions, missing days, future dates.
- Validate GraphQL schema and calendar coverage, duplicates, wrong dates and non-integer/negative values. Keep legitimate zero-activity days.
- Distinguish `contributions` from local `commits`, including backward-compatible aliases if needed; specify public metadata/redaction rules.
- Serialize canonical versioned snapshot; allow offline re-render and exact reproduction.
**Exit:** every output is driven from one validated fixture/snapshot with explicit semantics.

### Gate 2 — Reliable and auditable publication
- Add bounded network timeout, classified API errors, retry/backoff for transient failures only; no retry for auth/schema failures.
- Produce a manifest with `schemaVersion`, `snapshotId`, `generatedAt`, source revision/workflow run, hashes, per-range totals, quality status.
- Validate SVG as XML, no scripts/external dependencies, valid path coordinates, matching totals and hashes before mutation.
- Stage artifacts for review; publish only if all checks pass. Separate read-only build permission from minimal write-scoped publish credentials/jobs where practical.
- Preserve previous verified artifacts and a documented/manual-tested rollback. If retaining an orphan branch, require guarded ref update and immutable artifacts externally or in workflow artifacts.
- Add a freshness threshold policy and alert when successive scheduled builds fail; describe GitHub README caching as a separate layer.
**Exit:** publish is atomic from the user's perspective, recoverable, and diagnosable.

### Gate 3 — Shared rendering and visual truth
- Extract pure range selection, moving average, chart scale/geometry and curve generation into one shared source of truth.
- Remove or clearly retire unused legacy renderers only after proving CLI/output compatibility.
- Select visual language: **daily bars/points** for discrete data plus **smooth 7-day trend** is preferred; if keeping daily curve, verify monotone cubic/overshoot constraints and visual clarity.
- Mark incomplete current day; label Daily vs 7d trend unambiguously. Ensure mobile/365d readability and accessibility metadata.
- Keep SVG script-free and HTML self-contained with instant range switching.
**Exit:** same data produces matching numerical outputs and understandable visual differences across formats.

### Gate 4 — Meaningful test and CI gates
- Unit: calendar completeness, 3→15 updates, cumulative and moving-average math, UTC/DST, errors/retries, private-visibility fixtures, zero-only calendars, future dates, 30/90/365.
- Contract: mocked GraphQL responses (valid, partial, 401/403, 429, 5xx, timeout), deterministic immutable snapshot.
- Golden SVG snapshots + XML/path-validity assertions; embedded HTML payload parity; browser test for switcher/tooltip and resizing.
- Fix stale January 2026 smoke fixture (inject fixed clock or generate relative fixture dates); assert **exact counts**, not just nonempty files.
- Require the full gating suite before publish; do not equate an earlier independent green smoke run with a publish guarantee.
**Exit:** regressions reproduce prior failures and fail deterministically when correctness breaks.

### Gate 5 — Release, canary, documentation
- Build candidate from fixed snapshot, verify canary artifacts and actual GitHub API response at test time.
- Compare raw published files, manifest and profile README render; measure image cache behavior rather than guessing its TTL.
- Review scopes/permissions/privacy and ensure rollback is demonstrated in a nonproduction rehearsal.
- Update README, Action/CLI docs, release notes, and failure runbook. Preserve public interfaces or document any breaking change.
**Exit:** verified production artifact, accessible evidence, and an operational rollback path.

## 6. Validation matrix (minimum)

| Scenario | Expected assertion |
| --- | --- |
| Daily 2026-10-09=7, 2026-10-10=3 then 15 | Last point and 7d average recompute; 30-day total increases exactly by 12 for unchanged other days. |
| GraphQL omits one requested calendar date | Rejected as incomplete; never treated as a zero. |
| GraphQL returns a valid day with count 0 | Accepted and rendered as an actual zero. |
| Two source samples change during build | Build uses the **one frozen snapshot**; no mixed-generation assets. |
| Build crosses UTC midnight | All artifacts have identical `asOf` and range. |
| Inaccessible/private/restricted source | Clear visibility metadata; no claim that hidden contributions are included. |
| GitHub 429/5xx/timeout | Bounded retries when appropriate; failed publication preserves previous release. |
| Failure after generating some output | Nothing new published; manifest records failure context without secrets. |
| 30/90/365 and HTML switcher | Consistent per-range totals, dates, graph values and source snapshot ID. |
| Flat sequence, spike, multiple zeros | No visual overshoot; zero baseline and correct labels. |
| Date parsing, DST, future Git author date | Explicitly documented behavior and test assertions. |
| Static SVG loaded on GitHub | Script-free, externally self-contained, valid SVG; no JS required. |
| Rollback exercise | Previous verified release restored and hash checked. |

## 7. Open decisions to resolve before coding

- **Freshness SLA:** desired update cadence and alert threshold; distinguish source delay, workflow delay, and GitHub image-cache delay. Avoid promising real-time updates for static README embeds.
- **Rendering choice:** daily bars/points + 7d line (recommended) or daily line with explicitly defined interpolation.
- **Visibility:** exact metadata allowed in public `index.html` and SVG when restricted contributions are available.
- **Publication:** minimal branch-with-guard approach vs preserved immutable release artifact plus pointer; both must support rollback and retain self-contained public SVG.
- **Compatibility:** decide whether legacy `commits` keys remain deprecated aliases and whether CLI/Action outputs are unchanged.

## 8. Definition of done

All gates in [REMEDIATION_CHECKLIST.md](REMEDIATION_CHECKLIST.md) are complete with linked test/evidence and reviewed decisions. Every generated artifact is traceable to one frozen validated snapshot; numerical correctness is verified; stale data is visible/monitorable; publication cannot silently replace good data with invalid data; rollback is tested. The project continues to work with GitHub profile SVGs and offline local Git mode.

## 9. Verified remediation evidence (2026-10-10)

- Reviewed changes live in `fix/chart-snapshot-integrity-20261010`; **not merged into `main`**.
- A real GraphQL publish-build initially failed integrity validation because the full-year GitHub calendar omitted **2025-10-11** (GitHub responded with 364 days beginning 2025-10-12). This was not a zero-activity day in the API response; the fail-closed behavior was correct. See [diagnostic run](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082697496).
- Boundary-calendar recovery is now performed through a short **aliased `contributionsCollection` within the same one GraphQL HTTP POST**. Overlapping days must agree, incomplete calendars still fail. The source dataset is frozen before any HTML/SVG render.
- [Real GitHub API build 38082860981](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38082860981) passed source validation, all four artifact generation checks, the integrity verifier and artifact retention. The run's publish job was **skipped** because it ran on a non-`main` review branch.
- Captured snapshot: `b2b7861480c2199d7b737b9ec982385d056e4b51ae479759243063be5132a5d3`, `generatedAt=2026-10-10T20:13:15.317Z`, 365 days `2025-10-11..2026-10-10`. Values at that instant: **22** on Oct 10, **204** in 30 days, **765** in 90 days and **3050** in 365 days; source token includes restricted/private aggregate data as before.
- [Smoke CI 38083046571](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083046571) passed on the updated code including browser VM execution and a partial-week GraphQL fixture.
- DEUS MCP project runtime reports `package_manager_binary_missing`; Node validation was performed on a GitHub Actions Node 22 runner dispatched and examined **only through DEUS MCP**.
- **Additional verified CI:** [Smoke 38083228821](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083228821) and [real GraphQL build 38083244351](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083244351) both succeeded on commit `b9af864`, including standalone Python-standard-library XML validation for all three SVGs. [Draft PR #1](https://github.com/dturovskiy/deus-commit-chart/pull/1) is mergeable; PR smoke check succeeded.
- **Production verified:** [PR #1](https://github.com/dturovskiy/deus-commit-chart/pull/1) merged as `7a76e17`. [Publish 38083440184](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440184) and [Smoke 38083440198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440198) both SUCCESS. `activity-assets` now at `766cafd` with parent `b530710` (forward history; not force-pushed). Independent DEUS MCP `git show` confirmed a published HTML and all 30/90/365 SVGs agree with manifest snapshot `abdaa5a4c4ee4194f8fea7ca90e875d871801d0722328e21272773ce9e29afa0` (2026-10-10T20:21:46.111Z); totals 206/767/3052, 2026-10-10=24 at snapshot time.
- **Still open:** freshness alerts and cache observability, public privacy metadata policy, rollback rehearsal and direct README image-cache inspection. Operator details: [OPERATIONS.md](OPERATIONS.md).

## Chart design decision (2026-10-10)

For readability in GitHub README and the interactive report, replace the green cubic daily curve and filled area with **discrete green daily bars**, while retaining the **blue 7-day moving-average trend line**. Bars occupy day-centered bins and use adaptive widths (30/90/365) with no fabricated intermediate values. Zero-activity days have no positive-height bar; the current incomplete day remains visually highlighted. The trend is an overlay, not a substitute for daily data. Keep the same contribution snapshot and numerical source contracts.

This was verified on feature-branch smoke + live API builds. No image-generated preview is considered release evidence. Code and SVG/HTML output are the source of truth.

## Combined chart production evidence

Implementation merged in [PR #2](https://github.com/dturovskiy/deus-commit-chart/pull/2) as `dad9f87`. [Production publish 38085355727](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085355727) and [main smoke 38085355677](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38085355677) passed. Remote `activity-assets` has verified snapshot `182029efbeebcacae06114868c322dd621f385ccd1128fdd4814b514012c1546`. All published 30/90/365 SVGs now use positive-count green bars and one smooth blue 7-day trend line; interactive HTML uses the same snapshot. GitHub image-cache lag still requires measurement.

## Freshness and recovery implementation evidence (2026-10-10)

- **Operational choice:** scheduled GitHub publication continues every two hours. A separate monitor is offset from it and treats **eight hours** since `activity-assets/manifest.json.generatedAt` as stale; this permits delayed scheduled runs but is not a contractual source-to-README freshness guarantee. GitHub's image-proxy cache is independent.
- **Integrity:** health checks archive the **real published branch** then independently verify manifest checksums, 30/90/365 numeric parity, valid SVG XML, and freshness. The monitor is read-only with respect to `activity-assets`.
- **Alert:** fail-closed monitor creates at most one open GitHub issue titled `[chart-health] stale or missing contribution charts` with a diagnostic workflow link, then closes it after verified recovery. Delivery of notifications depends on GitHub watch/notification settings. The production incident lifecycle is not exercised by deliberately breaking production.
- **Recovery:** `ci/rehearse-rollback.sh` creates an isolated bare Git remote, pushes two valid snapshots, rejects a deliberately corrupted candidate (test remote ref unchanged), then restores the older release as a new forward-only commit. It checks restored manifest and all four assets byte-for-byte.
- **Verification:** [Smoke 38086628526](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086628526) **SUCCESS**, 27 tests passed, checksum rejection and rollback PASS in logs; [real GraphQL build 38086631846](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086631846) **SUCCESS**, production publish SKIPPED on the feature branch.
- **Still open:** GitHub README image-proxy lag measurement and separate public private/restricted metadata policy. The chart publisher and health monitor do not alter GitHub's contribution calculation semantics.

## 10. Evidence and source paths

- `generate-commit-chart.js:146-269,291-351,1048-1090` — adapters, series, CLI.
- `modern-renderer.js:108-199,217-283,286-511` — renderer/embedded browser JS.
- `.github/workflows/publish-pages.yml` — validated collection and fast-forward-only publication.
- `.github/workflows/monitor-freshness.yml`, `ci/check-freshness.js`, `ci/rehearse-rollback.sh` — monitoring and rollback rehearsal.
- `.github/workflows/smoke.yml` and `test/generator.test.js` — current coverage.
- `action.yml`, `README.md`, `PRIVACY.md`, `SECURITY.md` — public contracts and boundaries.
- `dturovskiy/README.md` — live README embed in profile repository.
- `https://github.com/dturovskiy/deus-commit-chart/actions/runs/38052498196` — observed publication run.
- `https://github.com/dturovskiy/deus-commit-chart/blob/activity-assets/index.html` — inspected published snapshot.
