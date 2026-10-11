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

## Marketplace-specific status: UI **discrepancy confirmed** (2026-10-11)

**Direct owner screenshot (2026-10-11, not committed to this public repository):** GitHub Marketplace listing `Deus Commit Chart` displayed `v1.5.2 (Latest)` in **About** and an `@v1.5.2` badge in its README, while **Use latest version → Choose a version** offered **only `v1.4.1`**. Thus the requested new Marketplace-installable version is *not actually available in that selector*. The screenshot is strong UI evidence for **TD-01 being open** despite successful release publication.

**Most likely missing step (requires actual UI confirmation):** the stable `v1.5.2` GitHub Release was created via GitHub CLI, which does not expose GitHub Marketplace's separate **Publish this Action to the GitHub Marketplace** release-editor checkbox. GitHub's [official publishing instructions](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) specify this checkbox. This is a probable explanation, **not** proof of the checkbox's current state, which was not visible in the screenshot.

**Minimal non-destructive remedy for the maintainer:**

1. Open [existing GitHub Release v1.5.2](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2), choose **Edit** (pencil icon).
2. In the release editor, find **Release Action → Publish this Action to the GitHub Marketplace**, enable it if unchecked, retain existing primary/secondary categories, and select **Update release**. If the checkbox is disabled, check GitHub's Marketplace Developer Agreement/permissions as documented by GitHub. **Do not create another tag/release, delete a version, or force-move the signed major `v1`.**
3. Refresh the [Marketplace listing](https://github.com/marketplace/actions/deus-commit-chart), open **Use latest version**, and verify that `v1.5.2` is offered and the generated snippet installs exactly `dturovskiy/deus-commit-chart@v1.5.2`. Take a cropped confirmation screenshot if possible.
4. Only **after** that direct UI proof close TD-01 and record the evidence. If `v1.5.2` is already checked in the editor but still missing from the chooser, do not toggle it off; investigate GitHub Marketplace sync/support instead.

### Previously completed GitHub Release steps

- GitHub CLI confirms `v1.5.2` is the **Latest GitHub Release**, but this is **not sufficient evidence** that the GitHub Marketplace listing is advertising the new version or that the green **Use latest version** snippet resolves to `@v1.5.2`.
- The authenticated DEUS MCP GitHub CLI interface used for this release does not expose a verified Marketplace publish-checkbox/menu action or a browser UI inspection. A Marketplace checkbox/selection has therefore **not** been claimed to have been performed.
- **Manual verification:** visit [Marketplace listing](https://github.com/marketplace/actions/deus-commit-chart), check the About version and **Use latest version** dropdown snippet; ensure it copies `uses: dturovskiy/deus-commit-chart@v1.5.2` or offers that exact version. If version still shows v1.5.1, open [v1.5.2 GitHub Release](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2) in GitHub's web interface and use the official Marketplace publication option for this existing release if available, without creating duplicate tags. Recheck after GitHub refreshes the listing. Do **not** overwrite the signed major `v1` reference to force the latest snippet.
- Until verified, **TD-01 stays open only for Marketplace listing/install-button confirmation and any necessary explicit GitHub UI publication**. The immutable tag, tested remote Action, GitHub stable Latest and updated repo README are already shipped.

## Accepted technical residuals

- **TD-04:** one trusted publishing job still has job-level `contents: write` despite checkout `persist-credentials:false` and ephemeral final-step Git authentication.
- **TD-05/TD-13:** GitHub raw/profile/browser caches are external. Accurate bounded observations do **not** establish an image-cache invalidation upper limit/SLA.
- **TD-07:** `main` branch protection intentionally deferred at user's request.
- **TD-08:** old public `activity-assets` history contains metadata no longer emitted; history was not rewritten.
- **TD-12:** broad manual cross-device/cross-browser visual QA deferred; functional light/dark Chromium checks passed.
- No new scheduled monitoring/CI, additional publisher jobs, secret artifacts or forced tag/branch rewrites.

**Follow-up:** after a screenshot or confirmed Marketplace UI inspection, record exact version/button text and close TD-01 only with that evidence.
