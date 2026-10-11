# Changelog

## 1.5.2

- Strengthen regression assurance without changing the published Action input/output contract: full GitHub GraphQL success/failure fixtures, deterministic SVG golden hashes, and an independent captured-live-API-to-candidate check of all 365 contribution days and 30/90/365 totals.
- Introduce an immutable internal `ContributionSnapshot` with validated provenance and share daily counts, trailing seven-day averages and chart geometry between HTML and SVG.
- Validate the generated standalone HTML in real Chromium on PR-only CI: controls, tooltip, keyboard navigation, 390px mobile scrolling, all three ranges and both supported themes. No extra scheduled CI jobs or external runtime dependencies.
- Improve maintainer-only operations: configurable **manual** freshness diagnostics, non-scheduled read-only multi-sample README cache audits and evidence-backed prioritized technical-debt/visual-review registers. These diagnostic workflows do **not** run when someone installs the Marketplace Action.
- Keep strict validated publication, fast-forward-only `activity-assets` history, current public-data minimization, no embedded credentials and the prior generation-only consumer contract.
- **Existing signed `@v1` alias still resolves to legacy v1.4.1** until a separately approved compatible signed transition. Pin `@v1.5.2` only after its exact release is published and verified; release readiness still requires the documented visual/risk acceptance gates.


## 1.5.1

- Refresh the GitHub Marketplace-facing README: accurate daily bars + 7-day trend, UTC local Git semantics, current release badge and explicit private-contribution aggregate disclosure.
- Replace a fragile profile publication snippet with a complete **manual-by-default** consumer workflow. Users can opt into one daily refresh; installation of the Action itself never starts a scheduled job.
- Keep publishing inside an isolated Git worktree and use a fast-forward-only push. Avoid failing on byte-identical output, while explicitly documenting that timestamp-only refreshes can still create commits.
- Add an actual isolated bare-Git integration test of the published workflow example: first publish, identical repeat, changed data and source checkout integrity.
- No change to chart generation, public input/output contracts or the signed older `@v1` alias. Existing consumers of `@v1.5.0` remain unaffected.

## 1.5.0

- Generate one validated 365-day activity snapshot and reuse it across interactive HTML and all requested 30/90/365-day SVG files, with a verifiable `manifest.json` and SHA-256 file digests.
- Check complete GitHub GraphQL day coverage, handle boundary weeks in one API request, classify errors, and retry only transient failures. Invalid or missing data fails closed instead of becoming zero activity.
- Minimize public GitHub metadata: never request or serialize a separate restricted/private contribution breakdown. **Daily aggregate counts still may reflect token-visible private contributions**. Previously published historical charts are not removed by upgrading.
- Render accurate daily bars and a separate seven-day moving-average trend using matching static-SVG/browser mathematics. Support UTC-normalized local Git data and an offline/local CLI.
- Preserve all 15 previous composite Action input names and both output names. The Action continues to **generate only**: it never publishes, schedules jobs or grants additional permissions. Node 22 and pinned upstream `actions/setup-node`; no runtime dependency installation.
- New strict output behavior: refuse to overwrite an existing output directory; malformed GraphQL calendar and invalid local Git inputs fail with a nonzero exit. Migration: choose a fresh `output-dir` for each run or clean it explicitly before invoking the Action.
- Separate maintainer implementation changes: PR-only CI and secret scanning, six-hour single-job profile publisher, checksummed publication, no-op publishes when snapshot and source SHA match, and manual-only diagnostics. **These internal workflows are not run when someone installs the Marketplace Action.**
- Release tag: `@v1.5.0`. The historical **signed `@v1` alias remains at v1.4.1** until separately approved and signed; users who want these fixes must opt in to the exact version.

## 1.4.1

- Add a product-oriented README hero with live 30-day demo, release/CI/license badges, and a minimal `@v1` quick start.
- Add contributor, security, issue-template, and pull-request guidance for public OSS use.
- Add repository metadata and discovery keywords to `package.json`.
- Add a dedicated privacy notice describing the no-backend/no-telemetry architecture and GitHub token handling.
- Add a separate end-user license agreement for Marketplace distribution while preserving the existing MIT source-code license.

## 1.4.0

- Add a reusable composite GitHub Action via `action.yml`.
- Add a profile-README quick start with scheduled chart generation and explicit publishing to `activity-assets`.
- Default the documented profile embed to the 30-day chart.
- Support GitHub-account and local-repository sources through the Action inputs.
- Expose generated output paths as Action outputs.

## 1.3.0

- Add modern smooth SVG rendering with gradient area fill and a dashed 7-day trend.
- Add compact, comfortable, and spacious layout presets plus custom width/height overrides.
- Rebuild the interactive HTML chart as SVG when switching between 30d, 90d, and 365d.
- Record GitHub restricted/private contribution visibility metadata.

## 1.2.0

- Add GitHub GraphQL contribution-calendar input.
- Add static README-safe SVG output for 30d, 90d, and 365d ranges.
- Add scheduled generation into the `activity-assets` branch.

## 1.1.0

- Prepare the original local Git commit-chart generator for public use.
