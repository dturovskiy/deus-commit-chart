# Marketplace Release Policy

> Release workflow for `dturovskiy/deus-commit-chart`. Version `v1.5.0` is intentionally separate from the previously signed `v1` alias. Nothing here enables `main` protection or recurring CI.

## Compatibility and actual installed code

- The **signed annotated** major tag `v1` and `v1.4.1` both resolve to `eddf908ead0a83361f4a4e2930405ce30fd3d086` (2026-09-01). They run the original pre-remediation implementation.
- The **new opt-in release** is `v1.5.0`. Consumers should use `uses: dturovskiy/deus-commit-chart@v1.5.0` for this release, or pin its exact commit SHA after checking the published GitHub Release.
- A successful `main` CI, current `activity-assets` SVG or merged PR **does not update** `@v1` and is not itself a Marketplace release.
- Inputs and outputs stay stable: all 15 input names and both `output-dir` and `index-html` outputs from v1.4.1 remain supported.
- Behavior improvements: one strictly validated 365-day snapshot for HTML and SVG, SHA-256 manifest, strict missing-day errors, bounded source retries, local Git timestamps normalized to UTC, 7-day trend and script-free SVG, public-data policy `daily-aggregates-only-v1` without private/restricted breakdown fields.
- **Potentially observable changes**: selected existing output directories now fail rather than being overwritten; local Git day buckets use UTC; malformed calendars now fail instead of being silently interpreted as zero contributions. Release notes and README must mention these changes.
- No maintainer-operated backend exists. The Action generates files only. It does not push to a consumer repository, create workflows, consume the maintainer's Actions quota or schedule any background work.

## Controlled versioned release

1. Bump `package.json` and `package-lock.json` to `1.5.0`, update changelog and README version-pinned quick starts; review PR and pass the full **PR-only** Smoke (Node/Python + offline composite Action + rollback + source secret guard).
2. Merge the reviewed source commit to `main` and verify that the public Action's inputs/outputs still match v1.4.1 and only the publisher has an automatic six-hour schedule.
3. Create a **new, immutable** `v1.5.0` tag pointing at the tested commit; never force-push an existing release tag. Before creating a GitHub Release, dispatch the **manual-only** `.github/workflows/marketplace-consumer.yml` consumer workflow against `main`. This explicitly loads the Action using the remote reference `dturovskiy/deus-commit-chart@v1.5.0`, builds a separate local Git fixture, fetches an authenticated GraphQL calendar in a separate invocation and verifies both outputs.
4. Only if tagged consumer validation succeeds, create `Deus Commit Chart v1.5.0` GitHub Release with accurate changelog/migration notes. Confirm the release/tag SHA and report exact CI IDs. The release may not appear on Marketplace search instantly because the listing is managed by GitHub.
5. The **signed `v1` alias stays fixed at v1.4.1** unless the maintainer separately approves advancing it and can sign the replacement alias. Do not delete, force-move or silently de-sign the existing annotated tag, and do not imply new security fixes reach old `@v1` consumers.

## Boundary and remaining risks

| Contract | v1.5.0 behavior |
|---|---|
| Composite Action inputs | `source`, `username`, `token`, `repo`, `branch`, `author`, `default-days`, `ranges`, `theme`, `layout`, `width`, `height`, `hide-border`, `output-dir`, `title` |
| Composite Action outputs | `output-dir`, `index-html` |
| Windows/formats | 30, 90, 365 days; standalone HTML, safe SVG, `manifest.json` and `.nojekyll` |
| Authorization | caller supplies GitHub token for `source: github`; `source: local` needs none |
| Publishing | performed **by caller**, independently of the reusable Action |
| Runtime | Node.js 22 via full-SHA pinned upstream `setup-node`; zero runtime dependencies |
| Known limitations | GitHub's token-visible daily aggregates may disclose private contribution timing, browser/README caching is independent, old published history is not automatically deleted |

- The release validation workflow is **manual-only** and uses a read-only `GITHUB_TOKEN`, one job, and no artifacts. Do not add a scheduled release canary.
- The upstream checkout/setup-node major-v4 generation requires periodic future maintenance but versions are pinned to verified immutable commit SHAs.
- `main` branch protection is intentionally deferred at the user's request.
