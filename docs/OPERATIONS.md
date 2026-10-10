# Deus Commit Chart — Production Operations and Rollback

> Scope: `dturovskiy/deus-commit-chart`. This is an operator runbook.
> Release and tests are controlled through DEUS MCP Git and GitHub CLI tooling.
> For open remediation tasks see [REMEDIATION_CHECKLIST.md](REMEDIATION_CHECKLIST.md).

## Architecture and publication

- Source: GitHub GraphQL contribution calendar; one HTTP POST with full-year and boundary-week aliases.
- The `main` branch is the source of truth for code. The `activity-assets` branch contains only published HTML/SVG and `manifest.json`.
- `.github/workflows/publish-pages.yml` runs a read-only build with all regression tests, writes a SHA-256 manifest and validates the generated SVG as XML, then passes an immutable workflow artifact to a separate write-scoped publishing job.
- The publish job is restricted to `refs/heads/main`. Validation dispatches on review branches never update `activity-assets`.
- The publisher creates a **fast-forward commit**, not a force push. This leaves a recoverable history of generated assets.

## Verify a production build

1. Use DEUS MCP `run_gh` to inspect the latest `Publish activity charts` run on `main`; both `build` and `publish` must have `conclusion=success`.
2. Fetch `activity-assets` and inspect `git show origin/activity-assets:manifest.json`. Require a 64-character `snapshotId`, `schemaVersion=1`, expected `sourceCommit`, `workflowRun` and `calendarDays=365`.
3. Compare `git show origin/activity-assets:index.html` embedded JSON with the manifest's exact snapshot ID, start/end dates and totals; check the three SVGs contain the same shortened ID and expected per-range totals.
4. If local Node.js is available, download the published `dist` workflow artifact and run `node verify-activity-assets.js dist`. On Linux CI also run `python3 ci/validate-svg.py dist`. These verify checksums and SVG XML policy.
5. Inspect the public README URL. GitHub's image proxy may cache an older SVG even when `activity-assets` is updated. Do not claim a guaranteed cache TTL without measurement.

## Freshness and recovery monitoring

- `.github/workflows/monitor-freshness.yml` checks the real `activity-assets` branch on a two-hour offset schedule. The configured threshold is **8 hours** from `manifest.generatedAt` (allowing several missed publish windows).
- It validates the **actual published files** with `verify-activity-assets.js` and `ci/validate-svg.py`, then runs `node ci/check-freshness.js` against the manifest. A missing branch/file, corrupt checksum, invalid SVG, incomplete manifest or stale timestamp fails the job.
- A failure opens **one deduplicated** issue titled `[chart-health] stale or missing contribution charts`; a later successful run closes it. GitHub issue notifications require the account to follow the repository or have suitable notification settings. Issue creation on a real incident is not simulated in production during rollout.
- `workflow_dispatch` supports a safe manual check of `main`. The monitor does not verify GitHub's image-proxy cache; it verifies `activity-assets`. GitHub scheduled Actions may be delayed; this is **not** a strict real-time SLA.
- `ci/rehearse-rollback.sh OLD_DIR NEW_DIR` runs a real local-bare-Git test: it pushes two separately validated snapshots, rejects a corrupt third snapshot while checking the remote ref remains unchanged, then creates a new forward-only restore commit and compares every recovered asset and manifest byte-for-byte.

## When publication fails

1. Inspect the failing CI step and error classification. Missing dates must stop the build, never silently become zero-activity days.
2. Check whether the failure was a GitHub authorization/visibility error, transient HTTP failure, malformed calendar, render issue, or branch push rejection. Do **not** retry auth/schema errors blindly.
3. Confirm that `activity-assets` still points at the last verified commit. Do not force-push a partially generated artifact.
4. Resolve the underlying issue on `main` through reviewed changes, rerun validation, then dispatch `Publish activity charts` from `main` when appropriate.

## Forward-only rollback procedure

**Rollback must produce a new fast-forward commit from a previously verified set of assets. Do not reset or force-push the production branch.**

In a clean *separate checkout* (not a developer's dirty worktree):

```bash
git fetch origin main activity-assets
git switch -C activity-assets origin/activity-assets
git log --oneline -5
# Manually choose GOOD_SHA of a previous verified activity-assets commit.
git show GOOD_SHA:manifest.json
git restore --source=GOOD_SHA --staged --worktree -- .
# verifyDirectory rejects a .git folder, so validate a clean archive:
VALIDATION_DIR="$(mktemp -d)"
git archive "$(git write-tree)" | tar -xf - -C "$VALIDATION_DIR"
node /path/to/main/verify-activity-assets.js "$VALIDATION_DIR"
python3 /path/to/main/ci/validate-svg.py "$VALIDATION_DIR"
git diff --cached --stat
git commit -m "revert: restore verified contribution chart snapshot"
git push origin HEAD:refs/heads/activity-assets
```

`GOOD_SHA` is a placeholder, **not** a literal commit. The historical pre-remediation orphan builds have no manifest and cannot automatically satisfy the new validator; use only a deliberately verified candidate. If a rollback is needed while the current build is the first verified release, create/review a fresh valid build or explicitly document and approve the legacy exception.

After any rollback, inspect `manifest.json`, HTML and SVG on the remote branch, and check the profile. Automated scheduled publishes may replace the rollback later; resolve the triggering defect or temporarily disable that schedule through authorized repository operations.

## Verified recovery rehearsal (2026-10-10)

The [Smoke CI run 38086628526](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086628526) passed **27 Node regression tests**, including API 401/403/429/503 cases, timeouts, malformed responses, incomplete calendar and freshness thresholds. The simulated isolated bare Git remote yielded:

- Corrupt third candidate: `Asset checksum mismatch: activity-30d.svg`; **ref unchanged**.
- Original verified snapshot commit: `bb98c1042573e9746cede84436891897b8402825`.
- Second verified snapshot commit: `d0d03fc24aa594a9aba8c1c02e2a7a2424a5c29a`.
- New forward-only restored commit: `7f8d81c16eea8018796982030ad85b2df1f84e1d`.
- Manifest and all four restored assets matched the original byte-for-byte.
- No production branch was touched; this is a **release-path rehearsal** and not a live disaster rollback.

[Real GraphQL branch build 38086631846](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086631846) succeeded, with production publish correctly skipped. The monitor's incident creation/closure will be verified independently of production failure injection; issue creation requires notification preferences for actual delivery.

## Production monitoring validation (2026-10-10)

- [PR #3](https://github.com/dturovskiy/deus-commit-chart/pull/3) merged as `de1b8c8`. [Publish 38086821217](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821217) and [Smoke 38086821198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821198) both passed.
- [Freshness monitor 38086854207](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086854207) passed on `main` after the actual publish: reported `healthy`, age `0.008234h` (~30 sec), threshold 8h. Validated `index.html`, 30/90/365 SVG, hashes, numerical parity and XML.
- The healthy run listed no open incident issue. Incident creation/closure and delivery under a **real production outage** remain unexercised; GitHub image-proxy caching remains out of scope for the manifest monitor.

## Source visibility and privacy

GitHub contribution counts depend on the viewer token and GitHub account settings. A viewer with access to restricted/private contributions can obtain different daily aggregates from an anonymous viewer. Our **public-data policy is `daily-aggregates-only-v1`**: GitHub's restricted/private contribution breakdown and separate commit totals are neither fetched for chart creation nor serialized into public assets. Daily aggregates still may include private activity according to token/account settings; preserving them necessarily discloses that aggregated signal. Do not publish raw GraphQL responses, tokens, repository identities, commit messages or issue contents. Old public history and cached versions may still contain the earlier restricted-count metadata; do not rewrite published Git history casually because recovery/rollback references depend on it.

## Confirmed initial production release

- Source squash commit: `7a76e176ea43802b937402fbc437ea68997d7ee2`.
- CI: [Publish activity charts #38083440184](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440184) and [Smoke #38083440198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38083440198), both successful.
- Published commit: `766cafd` (parent `b530710`), confirming a fast-forward release rather than force-push.
- Snapshot: `abdaa5a4c4ee4194f8fea7ca90e875d871801d0722328e21272773ce9e29afa0`, `2026-10-10T20:21:46.111Z`.
- Manifest ranges: 30d **206**, 90d **767**, 365d **3052**. Date 2026-10-10: **24** contributions at generation time.
- Independent DEUS MCP `git show` checks confirmed that the published HTML and each 30/90/365 SVG agree with this manifest and that none of their stdout responses were truncated.
- At the initial release, GitHub README image-cache freshness and rollback rehearsal were **not verified**. The rollback rehearsal was later completed in CI (see the verification section above); image-cache timing remains unverified.
