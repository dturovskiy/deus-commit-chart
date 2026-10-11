# Deus Commit Chart v1.5.2 — release and Marketplace handoff

**Release date:** 2026-10-11. **GitHub Release:** [Deus Commit Chart v1.5.2](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2) (**Latest**, stable; not draft or prerelease).

## Source and immutable version

- Release-source merge: [PR #27](https://github.com/dturovskiy/deus-commit-chart/pull/27) -> `main=a98f79b3675257e87c71e1425ea450101347bf3b`.
- New annotated Git tag `refs/tags/v1.5.2`, created and published specifically at that source SHA. No existing tags moved.
- All generated examples, `package.json`, `package-lock.json`, `CHANGELOG.md`, profile workflow and manual remote-tag consumer are version-aligned at `1.5.2`.
- The existing **signed `v1` major alias remains at legacy v1.4.1**, intentionally unchanged. Never claim that `@v1` automatically runs the new version, or force-update/de-sign it without an independently approved signing plan.

## Verification evidence

- [Final PR-only Smoke #38151327577](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151327577) **SUCCESS**: 85/85 Node tests, 11/11 Python tests; offline composite Action, numerical/365-day integrity, golden SVG hashes, privacy and source secret checks, rollback, real Chromium desktop/390px both themes for 30/90/365, keyboard, tooltips, no browser HTTP requests.
- [Exact remote-tag consumer #38151449398](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151449398) **SUCCESS** from `main=a98f79b`. GitHub Actions fetched `dturovskiy/deus-commit-chart@v1.5.2` at SHA `a98f79b` and ran both offline local-Git and authenticated GitHub GraphQL. Outputs validated HTML, safe XML/SVG 30/90/365, manifest SHA-256, `daily-aggregates-only-v1` public privacy policy and 365 days.
- Same tagged consumer ran independent `LIVE_API_CANDIDATE_PASS` at `2026-10-11T15:29:14.145Z`: **365 UTC days, totals 30d=282, 90d=845, 365d=3145**, matching SVG/HTML/manifest/captured in-memory GraphQL; raw response/token not retained as artifacts.
- [Postrelease publisher #38151631635](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151631635) **SUCCESS**; `activity-assets/manifest.json`: `sourceCommit=a98f79b`, generated `2026-10-11T15:31:36.016Z`, `snapshotId=ff879826141aaf61…`, 365 days and identical 282/845/3145 totals.
- Original remediation checklist **65/65**. The 30-day GitHub Marketplace desktop and profile iPhone screenshots plus a follow-up enlarged iPhone screenshot were reviewed; the user explicitly accepts **zoom-to-read** metadata on the compact static SVG. No claim of human visual review of every theme/range or browser: TD-12 retains that wider-device residual.

## Marketplace installation — verified 2026-10-11

**Owner UI evidence:** initial Marketplace screenshot showed `v1.5.2 (Latest)` in About but only legacy `v1.4.1` under **Use latest version → Choose a version**. The owner then showed the existing [v1.5.2 Release](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2) editor with **Publish this Action to the GitHub Marketplace** already enabled, correct action metadata and categories (Continuous integration / Utilities), and used **Update release**.

**Final owner screenshot:** the Marketplace version selector now visibly offers **`v1.5.2`** as well as `v1.4.1`. The versioned install reference is:

```yaml
uses: dturovskiy/deus-commit-chart@v1.5.2
```

The new exact version was independently executed in [tagged Action consumer #38151449398](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151449398). **TD-01 complete.** No new GitHub Release or tag was required; the signed legacy major tag `v1` remains at v1.4.1 by deliberate decision. User-provided screenshots containing unrelated tabs are not uploaded to the public repository.

## Accidental release Contributors attribution — corrected

The v1.5.2 release originally contained a plain-text `@v1` mention while explaining the historical major-version tag. GitHub interpreted this as a mention of the unrelated GitHub account `v1` and included that account in its **Contributors** avatar list. This is not evidence of a PR, commit or access to the repository. [GitHub release documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) explicitly states that users mentioned in release notes appear under Contributors and are removed when mentions are removed.

Read-only provenance audit found **16 commits between v1.5.1 and v1.5.2**, all authored by Denys Turovskiy; the annotated tag's tagger and the GitHub Release author are both `dturovskiy`. Using DEUS MCP, the original release notes were minimally edited to replace the misleading plain mention with the literal code-formatted tag `v1`. Subsequent `gh release view v1.5.2` confirms that the accidental mention is absent and the release remains stable, non-draft and **Latest**. No code, commit history or tag was modified. The avatar's disappearance from the browser UI is expected under GitHub's documented behaviour; a separate post-edit browser screenshot has not yet been supplied.

**Preventive policy:** when writing release notes, describe a Git reference as `v1` (code-formatted, without a bare at-sign), rather than a bare GitHub user mention. A tag that resembles an account name must not accidentally credit that account.

## Accepted technical residuals

- **TD-04:** one trusted publishing job still has job-level `contents: write` despite checkout `persist-credentials:false` and ephemeral final-step Git authentication.
- **TD-05/TD-13:** GitHub raw/profile/browser caches are external. Accurate bounded observations do **not** establish an image-cache invalidation upper limit/SLA.
- **TD-07:** `main` branch protection intentionally deferred at user's request.
- **TD-08:** old public `activity-assets` history contains metadata no longer emitted; history was not rewritten.
- **TD-12:** broad manual cross-device/cross-browser visual QA deferred; functional light/dark Chromium checks passed.
- No new scheduled monitoring/CI, additional publisher jobs, secret artifacts or forced tag/branch rewrites.

**Follow-up:** after a screenshot or confirmed Marketplace UI inspection, record exact version/button text and close TD-01 only with that evidence.
