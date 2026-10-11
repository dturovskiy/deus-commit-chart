<h1 align="center">Deus Commit Chart</h1>

<p align="center">
  <strong>Static GitHub contribution charts without a third-party runtime service.</strong>
</p>

<p align="center">
  Generate accurate daily activity bars and a smooth seven-day trend for 30 / 90 / 365 days as README-safe SVGs, plus a self-contained interactive HTML report built from GitHub or local Git data.
</p>

<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart/releases/latest"><img alt="GitHub release" src="https://img.shields.io/github/v/release/dturovskiy/deus-commit-chart?display_name=tag"></a>
  <a href="https://github.com/dturovskiy/deus-commit-chart/actions/workflows/smoke.yml"><img alt="Smoke CI" src="https://github.com/dturovskiy/deus-commit-chart/actions/workflows/smoke.yml/badge.svg"></a>
  <a href="https://github.com/dturovskiy/deus-commit-chart/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/dturovskiy/deus-commit-chart"></a>
  <img alt="GitHub Action" src="https://img.shields.io/badge/GitHub%20Action-v1.5.2-2088FF?logo=githubactions&logoColor=white">
</p>

<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart">
    <img src="https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg" alt="Deus Commit Chart 30-day GitHub contribution activity demo" />
  </a>
</p>

<p align="center">
  <strong>Static SVG · no live chart backend · 30/90/365d · GitHub Actions · local Git</strong>
</p>

## Why Deus Commit Chart

- **Reliable profile embeds:** README rendering uses pre-generated static SVG instead of a live third-party chart endpoint.
- **Account-wide GitHub activity:** use GitHub's contribution calendar and publish only daily aggregate counts; private/restricted contribution breakdown fields are intentionally omitted.
- **Local repository mode:** generate charts directly from `git log` without network access.
- **Interactive report:** switch between 30d, 90d, and 365d instantly in the generated self-contained HTML page.
- **No charting dependency:** generated output is self-contained and the renderer has no external chart-library dependency.

## Quick start

Use the versioned GitHub Action in any workflow:

```yaml
- name: Generate contribution charts
  uses: dturovskiy/deus-commit-chart@v1.5.2
  with:
    username: ${{ github.repository_owner }}
    token: ${{ github.token }}
    default-days: '30'
    ranges: '30,90,365'
    layout: spacious
    output-dir: activity-dist
```

The Action generates `index.html` plus static `activity-30d.svg`, `activity-90d.svg`, and `activity-365d.svg`. Publishing is intentionally left to the caller so installing the Action never force-pushes a branch by itself.

## Add it to your GitHub profile

The Action **generates files only**. Installing it does not schedule jobs, modify a branch, or update your README. If you want a profile embed, copy the **[complete, opt-in profile workflow](docs/PROFILE_WORKFLOW_EXAMPLE.yml)** to `USERNAME/USERNAME/.github/workflows/activity-chart.yml`. That sample calls the pinned `@v1.5.2` release, validates the output, and publishes HTML/SVG to the dedicated `activity-assets` branch without force-pushing.

**The example is manual-only by default.** Run it once using **Actions → Update contribution chart → Run workflow**. To refresh automatically, uncomment its optional **daily UTC** schedule. Standard GitHub-hosted runners are free for public repositories; runs in private repositories can consume your account's included Actions minutes. Use the dedicated `activity-assets` branch only for generated charts—the example replaces its other contents.

The standalone Action itself needs only the token it uses to query GitHub; **`contents: write` is required only by your optional publishing workflow**, not by the generator. The example uses a separate Git worktree so publishing never deletes the checked-out source. It avoids empty commits when output bytes are identical, but since build timestamps change, repeated runs with unchanged counts can still create history. The maintainer's own publisher has a stricter verified snapshot no-op check; do not assume the shorter consumer example has that feature.

Then embed the 30-day chart in the profile README:

```html
<p align="center">
  <img
    src="https://raw.githubusercontent.com/USERNAME/USERNAME/activity-assets/activity-30d.svg"
    alt="GitHub contribution activity for the last 30 days"
  />
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/USERNAME/USERNAME/activity-assets/activity-30d.svg">30d</a> ·
  <a href="https://raw.githubusercontent.com/USERNAME/USERNAME/activity-assets/activity-90d.svg">90d</a> ·
  <a href="https://raw.githubusercontent.com/USERNAME/USERNAME/activity-assets/activity-365d.svg">365d</a>
</p>
```

For public contribution activity, the workflow token is usually sufficient. To request broader private/internal visibility, add a repository secret named `DEUS_COMMIT_CHART_TOKEN` containing a GitHub token with access appropriate to the contributions you want GitHub to return. The generated chart intentionally contains aggregate daily counts only, not repository names or commit details. **Those counts can nevertheless reveal the timing of private activity visible to the token.**

The Action only generates files; publishing them is intentionally explicit in the caller workflow. **Version pin:** use the published and independently verified `@v1.5.2` release ([tagged consumer run](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151449398)). The historical signed major tag `v1` remains on v1.4.1 and **does not** automatically select v1.5.2. Its main inputs are `username`, `token`, `default-days`, `ranges`, `theme`, `layout`, `width`, `height`, `hide-border`, and `output-dir`. It also supports `source: local` for workflows that want to chart a checked-out Git repository instead of a GitHub account.

## Interactive HTML

Generate a local report from a Git repository:

```bash
node generate-commit-chart.js \
  --repo /path/to/git/repo \
  --branch main \
  --days 90 \
  --out commit-chart.html \
  --title "Commit activity"
```

Open `commit-chart.html` in a browser. The report contains a built-in range switcher for:

- `30d` — recent pulse;
- `90d` — quarter-scale trend;
- `365d` — long-range activity.

`--days` selects the initially active range. The other ranges remain available in the generated HTML. Clicking a range does not call GitHub again: the page slices the embedded trailing-365-day dataset and rebuilds the chart as a new SVG in the browser.

The chart spacing is configurable with `--layout compact|comfortable|spacious`; `--width` and `--height` can override the preset dimensions when a custom aspect ratio is needed.

## README-safe SVG

GitHub profile READMEs cannot rely on JavaScript inside an embedded chart, so README output is intentionally static.

Generate one range:

```bash
node generate-commit-chart.js \
  --repo /path/to/git/repo \
  --branch main \
  --format svg \
  --days 90 \
  --theme github-compact \
  --layout spacious \
  --out activity-90d.svg \
  --title "Contribution activity"
```

Generate all three ranges:

```bash
for days in 30 90 365; do
  node generate-commit-chart.js \
    --repo /path/to/git/repo \
    --branch main \
    --format svg \
    --days "$days" \
    --out "activity-${days}d.svg" \
    --title "Contribution activity"
done
```

Available SVG themes:

- `github-compact`;
- `github-light`.

Use `--hide-border` for a borderless SVG. The combined chart displays **one green bar per day** for discrete GitHub contribution counts, with a **smooth blue `7d trend` line** above the bars. Zero-activity days remain empty at the baseline; the current, still-incomplete day is highlighted. Bar widths scale automatically for 30/90/365-day windows. The trend uses shape-preserving interpolation without inventing intermediate peaks.

Layout presets:

- `compact` — 900×300;
- `comfortable` — 1000×350 (default);
- `spacious` — 1120×410, used by the published profile assets.

Custom dimensions are also supported, for example `--width 1280 --height 440`.

## GitHub account contribution source

For account-wide GitHub contribution activity, use the GitHub GraphQL source instead of a local repository:

```bash
GITHUB_TOKEN=... node generate-commit-chart.js \
  --source github \
  --username dturovskiy \
  --format svg \
  --days 90 \
  --out activity-90d.svg \
  --title "GitHub contribution activity"
```

The token is read from one of these environment variables, in order. Set it using your runner's secrets or an environment variable; **never paste a real token into a committed workflow or CLI command history**:

1. `DEUS_COMMIT_CHART_GITHUB_TOKEN`
2. `GITHUB_TOKEN`
3. `GH_TOKEN`

Tokens are deliberately not accepted as CLI arguments so they do not appear in the process command line.

The GitHub source requests the trailing 365-day contribution calendar once per batch generation. Generated HTML and SVGs do not contact GitHub afterward. **The profile publisher runs only every six hours (or when manually dispatched), independently of CI.** GitHub Actions scheduling and GitHub's image proxy cache can introduce additional, unbounded delays. The SVG labels its UTC build timestamp and snapshot ID.

## Automated publishing

The repository includes `.github/workflows/publish-pages.yml`. Despite the historical filename, the workflow now publishes generated artifacts to the dedicated `activity-assets` branch, so README rendering does not depend on GitHub Pages being enabled.

The branch contains:

```text
/index.html
/activity-30d.svg
/activity-90d.svg
/activity-365d.svg
```

The SVG files are static and intended for README embedding. For `dturovskiy/deus-commit-chart`, stable raw targets are:

```text
https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg
https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-90d.svg
https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-365d.svg
```

The workflow runs **only on its six-hour schedule or manual dispatch on `main`**. It makes one GraphQL request, generates HTML/SVG with a manifest, checks data integrity and XML, then creates a fast-forward commit on `activity-assets` (no force-push). **There is no regression suite, dependency install, separate build job or uploaded Actions artifact in the scheduled refresh.** The publisher skips creating a commit when the existing deployed assets pass full validation and both the 365-day snapshot and generator source revision are unchanged; it still checks GitHub every six hours. In that case the visible `Updated` timestamp remains the time of the **last published snapshot**, not the most recent no-op check. A new UTC day, changed contribution count, modified generator code or damaged existing assets forces publication. The last published assets stay intact if generation or validation fails.

**CI runs only when a PR targets `main`.** The PR-only Smoke workflow tests source code, offline/local Marketplace Action compatibility, 30/90/365 SVG/HTML behavior and rollback. There are **no automatic freshness or README-cache audit workflows**; maintainer diagnostics can be dispatched manually, without creating issues or running on a schedule. See the workflow files under `.github/workflows/` for their supported inputs.

A profile README can embed the default 30-day range directly from the generated branch:

```html
<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart">
    <img src="https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg" alt="GitHub contribution activity for the last 30 days" />
  </a>
</p>
```

The generated `index.html` still contains the interactive 30d / 90d / 365d switcher and can be opened locally from the chosen output directory or a checkout of the published `activity-assets` branch. The maintainer's scheduled publisher does **not** upload Actions artifacts. If GitHub Pages is enabled later for the `activity-assets` branch, the same HTML can be served as an interactive public page without changing the generator.

By default the publishing workflow authenticates with `github.token`. An optional repository secret named `DEUS_COMMIT_CHART_TOKEN` can override it when broader GitHub contribution visibility is required.

## Why static SVG for profiles

A profile README should not depend on a live third-party chart service at page-render time.

Recommended flow:

```text
GitHub Action / local job
        ↓
GitHub GraphQL or local Git
        ↓
Deus Commit Chart
        ↓
static activity-30d.svg / activity-90d.svg / activity-365d.svg
        ↓
GitHub profile README
```

This removes the runtime dependency on an external Vercel/serverless chart endpoint. If the chart generator is temporarily unavailable, the last generated SVG remains renderable.

## Data semantics

### Local source

The local source reads ISO 8601 author timestamps with timezone offsets from Git, then buckets commit instants by **UTC date** (not by the author’s local date):

```bash
git log --format=%aI
```

Optional filters:

```bash
--branch main
--author dturovskiy
```

The calendar is extended through the current UTC day, preserving zero-activity days after the latest commit.

### GitHub source

The GitHub source reads:

```text
user
└── contributionsCollection
    └── contributionCalendar
        └── weeks
            └── contributionDays
                ├── date
                └── contributionCount
```

This is contribution-calendar activity, **not every raw Git commit**. GitHub's `contributionCount` can include qualifying commits and other profile contributions such as pull requests, issues, reviews, discussions, repository creation, and similar contribution-calendar events. Like GitHub's native contribution squares, this metric omits commits that GitHub does not count as profile contributions (for example, non-qualifying branches or unassociated author email identities). To compare the chart with native squares, use the same account/visibility settings, date window and observation time: private-activity permissions, UTC date bucketing and late-arriving GitHub updates can legitimately change the result. The producer rejects missing or contradictory API dates and independently compares all 365 daily counts, 30/90/365 totals and SVG/HTML/manifest in a [manual live validation](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38144804210).

**Public data policy: daily-aggregates-only-v1.** Private/internal contribution activity depends on the GitHub token and account contribution-visibility settings. The publisher uses `DEUS_COMMIT_CHART_TOKEN` when configured and otherwise falls back to `github.token`. It now queries only the contribution-calendar **date and daily count**, never requests the restricted/private breakdown (`restrictedContributionsCount`, `hasAnyRestrictedContributions`) or separate commit/total counters, and does not serialize these fields or local repository/author details in public GitHub-mode HTML, SVG, or manifest.

**Important:** the published 365 daily counts may still include private/internal contributions exposed to the token. This aggregate signal can reveal their existence or timing; the chart cannot keep the same daily totals while concealing their private component. For strictly public-only charts, use appropriate GitHub token/account privacy settings or do not publish. Previously published versions may remain in Git history or caches; this change does not erase those historical files.

## Output metrics

The HTML report includes:

- discrete green daily contribution bars;
- a smooth blue `7d trend` (the 7-day moving average);
- instant 30d / 90d / 365d in-browser SVG rebuilding;
- active-day count;
- peak day;
- data freshness and a generic source-visibility notice (no private-count breakdown);
- exact calendar range.

The static SVG includes:

- one discrete bar per day with recorded activity;
- a separate smooth 7-day moving-average trend line (no artificial daily line or filled area);
- the exact activity total;
- active-day count;
- source and date-range metadata.

## CLI reference

```text
--source        local | github
--repo          local Git repository path
--branch        local branch/ref, default: main
--author        optional local Git author filter
--username      GitHub login for --source github
--format        html | svg; inferred from --out extension when omitted
--days          30 | 90 | 365; default: 90
--theme         github-compact | github-light
--layout        compact | comfortable | spacious
--width         optional custom chart width, 640-2400
--height        optional custom chart height, 240-1200
--hide-border   hide the outer SVG border
--title         chart title
--description   optional subtitle / accessible SVG description
--out           output path
```

## Local Git reports (Linux, macOS or WSL)

Use the standard CLI directly; no project-specific wrapper or special Windows setup is required:

```bash
node generate-commit-chart.js \
  --repo /path/to/git/repo \
  --branch main \
  --out commit-chart.html \
  --title "Commit activity"
```

Choose the output path yourself, including `/mnt/c/Users/.../Downloads/commit-chart.html` in WSL if you want it in Windows Downloads.

## Documentation and project status

- [Copy-ready, opt-in GitHub profile workflow](docs/PROFILE_WORKFLOW_EXAMPLE.yml) — generate and publish your own charts.
- [Security policy](SECURITY.md) and [privacy policy](PRIVACY.md) — disclosure procedures and data visibility.
- [Contributor guide](CONTRIBUTING.md) — development, testing and pull requests.
- [Release v1.5.2](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2) — latest Marketplace-installable exact version, verified by remote-tag local Git and authenticated GraphQL tests.

The original remediation checklist finished **65/65**. Maintainer-only audit evidence, historical checklists, security investigations and ongoing technical-debt planning are kept outside the public source tree. This does **not** erase historical copies reachable from previous public Git commits or release tags. The signed legacy major tag `v1` still targets v1.4.1; pin `@v1.5.2` for the latest release.

## Development

```bash
npm ci
npm test
npm run check
```

The smoke workflow validates the reusable Action, interactive HTML range controls, and static SVG output for 30d, 90d, and 365d.

Contributions are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development and pull-request guidance. Please use the issue templates for bugs and feature requests, and follow [`SECURITY.md`](SECURITY.md) for sensitive reports.

## Privacy and terms

With the default `--source local`, the tool reads only local Git metadata and makes no network requests.

With `--source github`, the tool contacts only the GitHub GraphQL API during generation using the token supplied through the environment. Generated HTML and SVG artifacts are self-contained and make no subsequent API calls.

Deus Commit Chart currently operates no maintainer-controlled backend, telemetry service, analytics endpoint, or user database. See [`PRIVACY.md`](PRIVACY.md) for the complete data-handling notice and [`EULA.md`](EULA.md) for the end-user terms used for Marketplace distribution. The source code remains licensed under the [`MIT License`](LICENSE).
