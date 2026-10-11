# Deus Commit Chart — Production Operations and Rollback

> Scope: `dturovskiy/deus-commit-chart`. This is an operator runbook.
> Release and tests are controlled through DEUS MCP Git and GitHub CLI tooling.
> For open remediation tasks see [REMEDIATION_CHECKLIST.md](REMEDIATION_CHECKLIST.md).

## Architecture and publication

- Source: GitHub GraphQL contribution calendar; one HTTP POST with full-year and boundary-week aliases.
- The `main` branch is the source of truth for code. The `activity-assets` branch contains only published HTML/SVG and `manifest.json`.
- `.github/workflows/publish-pages.yml` is a **single-job data refresh**, scheduled once every six hours (`17 */6 * * *`) or manually dispatched on `main`. It never runs `npm test` or `npm run check`: it renders one GitHub snapshot, validates the SHA-256 manifest/numerical contract and SVG XML, then pushes a new fast-forward commit.
- The scheduled publisher needs `contents: write` only because the same trusted job publishes directly; it does not upload/download intermediate Actions artifacts, install packages, or run on pull requests. The reviewed Marketplace composite Action remains independent and never publishes for consumers.
- CI (`.github/workflows/smoke.yml`) runs **only on pull requests targeting `main`** and retains offline Marketplace Action, renderer, failure-policy and rollback tests.
- The publisher creates a **fast-forward commit**, not a force push. Before committing it validates the *deployed* asset bundle and compares its deterministic 365-day snapshot ID and original generator `sourceCommit` against the new candidate. An identical snapshot built from identical code requires **no new commit**; a new UTC day, changed contribution, changed code, or invalid prior publication always triggers a new verified commit. Skipped refreshes do not change the previously displayed `Updated` timestamp. This limits branch history growth without weakening correctness.

## Verify a production build

1. Use DEUS MCP `run_gh` to inspect the latest `Publish activity charts` run on `main`; its single `publish` job must have `conclusion=success`.
2. Fetch `activity-assets` and inspect `git show origin/activity-assets:manifest.json`. Require a 64-character `snapshotId`, `schemaVersion=1`, expected `sourceCommit`, `workflowRun` and `calendarDays=365`.
3. Compare `git show origin/activity-assets:index.html` embedded JSON with the manifest's exact snapshot ID, start/end dates and totals; check the three SVGs contain the same shortened ID and expected per-range totals.
4. If local Node.js is available, archive the published `activity-assets` branch to a clean directory (without `.git`) and run `node verify-activity-assets.js <directory>` followed by `python3 ci/validate-svg.py <directory>`. The production workflow no longer retains Actions artifacts; the branch and manifest are the release evidence.
5. Inspect the public README URL. GitHub's image proxy may cache an older SVG even when `activity-assets` is updated. Do not claim a guaranteed cache TTL without measurement.

## Calendar source and README cache probe

All chart windows are anchored to the build's **UTC day**. GitHub's contribution-day labels are preserved verbatim. Local Git commit instants are normalized to UTC; author-local day grouping is intentionally no longer used. The chart contract is independently checked on build and release (365 contiguous dates, cumulative totals, 7-day mean, snapshot identity). See [CALENDAR_AND_CACHE_POLICY.md](CALENDAR_AND_CACHE_POLICY.md).

To validate a candidate against a **single independently captured live API reply**, manually dispatch `marketplace-consumer.yml` on `main`. The final `ci/live-api-candidate.js` step uses the same secret/fallback token policy as the publisher, keeps the captured reply strictly in memory, checks every UTC day and 30/90/365 sums against the resulting HTML/SVG/manifest, and discards temporary data. Only a success marker with generatedAt, public totals and shortened snapshot ID enters run logs. It performs no publication, scheduled polling, artifact upload or issue creation. Negative fixtures are in `test/live-api-candidate.test.js`.

The [README cache audit workflow](../.github/workflows/audit-readme-cache.yml) is **manual-only**. It compares the published snapshot with the GitHub profile image when possible and writes a job summary without uploading an artifact. It does not consume scheduled jobs or affect publishing.

## README cache-audit result and interpretation

On [2026-10-10 run 38088946652](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38088946652), the current production snapshot had been generated 28.47 seconds earlier and was already returned by the direct raw URL and the URL embedded by the actual GitHub profile HTML. The profile's image `src` was **raw.githubusercontent.com**, not `camo.githubusercontent.com`. The raw response advertised `Cache-Control: max-age=300` and a CDN `ETag`; this is **not a guaranteed maximum update delay** for GitHub mobile/browser image caches.

The audit reports **`profile_raw_matched`** when GitHub emits a direct raw image link and that image has the latest snapshot. A **`proxy_matched`** or **`proxy_lag_observed`** classification requires an actual independent `camo.githubusercontent.com` URL. Only collect further measurements deliberately with a manual dispatch. Do not alert on an unobservable proxy or claim that a single matching sample establishes a strict SLA.

## Corrected cache measurement evidence

[PR #6](https://github.com/dturovskiy/deus-commit-chart/pull/6) prevents a profile raw URL from being reported as an independent camo proxy. After [production publish 38089214515](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38089214515), [probe 38089253244](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38089253244) reported `profile_raw_matched`, `independentImageProxyObserved=false`, snapshot age 36.77s. Production snapshot `c149a3bf...`, totals 227/788/3073. Continue sampling after future publishes; do not treat a raw `max-age=300` response as a camo/browser image-cache SLA.

## 2026-10-11 scheduled CI incident: frozen timestamp regression

At [scheduled publish #38126315444](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38126315444), the build failed in `npm run check`: `test/freshness.test.js` had a fixed `2026-10-10T20:00:00Z` manifest but called `checkFreshness()` **without an injected clock** in three invalid-metadata assertions. The test began failing when that fixture exceeded the 8-hour freshness threshold, even though the code and snapshot were otherwise usable. Publishing was correctly blocked by CI. With no new release, [monitor #38127965027](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38127965027) found the published snapshot 8.32 hours old and opened incident [#8](https://github.com/dturovskiy/deus-commit-chart/issues/8). These represent **one cascading root cause**, not two independent chart defects.

Mitigation: all metadata fixture assertions use a fixed `now`; production validation rejects malformed ranges before testing age. The **current design** runs the full regression suite only when a PR targets `main`. Scheduled data refreshes run every six hours and enforce the generated-artifact integrity and SVG XML gates, with no intermediary Actions artifact. A failed scheduled data fetch or invalid asset still fails that publication; it leaves the previous valid chart intact. The old auto-incident monitor and cache audit have been retired from schedules. The historical #8 incident was automatically closed after verified recovery.

## Manual diagnostics and recovery

The manual freshness workflow accepts an optional `max_age_hours` input (8, 24, 48 or 72 hours; default 24), reports pass/fail in its workflow run and writes a summary even when validation fails. The summary separately records fetch, asset-integrity and freshness outcomes, including `not-run` for steps skipped after an earlier failure. This is an **on-demand diagnostic**, not a continuously operating alerting service. Do not enable scheduled monitors or automatic issues without a separate operational decision.

- There is **no scheduled freshness monitor** and **no automatic incident issue creation**. The historical `monitor-freshness.yml` remains as an optional read-only `workflow_dispatch` diagnostic: it fetches actual published files, validates checksums and SVG XML, and checks age against **24 hours**. This does not replace publishing or check GitHub image-proxy cache.
- The README cache probe is also **manual-only**, writes to the GitHub Actions run summary, and retains no Actions artifacts. Neither diagnostic runs while the project is idle.
- The PR-only Smoke workflow runs `ci/rehearse-rollback.sh OLD_DIR NEW_DIR` against an isolated local bare Git remote. It rejects corrupt publish candidates, verifies the remote ref is unchanged, then restores a verified prior snapshot in a new forward-only commit.
- A failed six-hour publication remains visible as a failed workflow run, but cannot mutate the published chart if generation/verification fails. Inspect it manually when needed; do not add another periodic notifier.

## When publication fails

1. Inspect the failing *publisher* step or PR CI step and the source error classification. Missing dates must stop publication, never silently become zero-activity days.
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

[Real GraphQL branch build 38086631846](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086631846) succeeded, with production publish correctly skipped. Historical monitoring was subsequently exercised during [incident #8](https://github.com/dturovskiy/deus-commit-chart/issues/8); that automatic-monitoring path has since been retired in favor of manual diagnostics.

## Production monitoring validation (2026-10-10)

- [PR #3](https://github.com/dturovskiy/deus-commit-chart/pull/3) merged as `de1b8c8`. [Publish 38086821217](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821217) and [Smoke 38086821198](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086821198) both passed.
- [Freshness monitor 38086854207](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38086854207) passed on `main` after the actual publish: reported `healthy`, age `0.008234h` (~30 sec), threshold 8h. Validated `index.html`, 30/90/365 SVG, hashes, numerical parity and XML.
- At the time of that historical run, no issue was open. The automatic monitor was later exercised by incident #8 and is **now manual-only**; image-proxy caching remains outside the publisher's correctness contract.

## Privacy-safe rollback constraint

The publication verifier now rejects previously emitted GitHub-mode metadata fields that describe restricted/private contribution breakdowns. For a rollback, select a verified `activity-assets` commit **from the privacy-safe release onwards** (`publicDataPolicy: daily-aggregates-only-v1`). An earlier release may have a valid checksum and still be disallowed by the new privacy policy. Do not bypass the verifier to resurrect historical restricted-count metadata. Old public Git history, image caches, forks, and retained workflow artifacts were not erased; removing them safely requires a separate, deliberate publication-history review, not an automatic force push.

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
