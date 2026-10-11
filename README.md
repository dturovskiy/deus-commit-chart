<h1 align="center">Deus Commit Chart</h1>

<p align="center">
  <strong>Static GitHub contribution charts without a third-party runtime service.</strong>
</p>

<p align="center">
  Generate smooth 30d / 90d / 365d profile charts as README-safe SVGs, plus an interactive HTML report powered by GitHub Actions or local Git data.
</p>

<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart/releases/latest"><img alt="GitHub release" src="https://img.shields.io/github/v/release/dturovskiy/deus-commit-chart?display_name=tag"></a>
  <a href="https://github.com/dturovskiy/deus-commit-chart/actions/workflows/smoke.yml"><img alt="Smoke CI" src="https://github.com/dturovskiy/deus-commit-chart/actions/workflows/smoke.yml/badge.svg"></a>
  <a href="https://github.com/dturovskiy/deus-commit-chart/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/dturovskiy/deus-commit-chart"></a>
  <img alt="GitHub Action" src="https://img.shields.io/badge/GitHub%20Action-v1-2088FF?logo=githubactions&logoColor=white">
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
- **Account-wide GitHub activity:** use GitHub's contribution calendar, with restricted/private visibility diagnostics when GitHub returns them.
- **Local repository mode:** generate charts directly from `git log` without network access.
- **Interactive report:** switch between 30d, 90d, and 365d instantly in the generated self-contained HTML page.
- **No charting dependency:** generated output is self-contained and the renderer has no external chart-library dependency.

## Quick start

Use the versioned GitHub Action in any workflow:

```yaml
- name: Generate contribution charts
  uses: dturovskiy/deus-commit-chart@v1
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

The fastest setup is to call Deus Commit Chart as a GitHub Action from your profile repository. Create `.github/workflows/activity-chart.yml` in `USERNAME/USERNAME`:

```yaml
name: Update activity chart

on:
  schedule:
    - cron: '17 */6 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  chart:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout profile repository
        uses: actions/checkout@v4

      - name: Generate charts
        uses: dturovskiy/deus-commit-chart@v1
        with:
          username: ${{ github.repository_owner }}
          token: ${{ secrets.DEUS_COMMIT_CHART_TOKEN || github.token }}
          default-days: '30'
          ranges: '30,90,365'
          layout: spacious
          output-dir: activity-dist

      - name: Publish generated branch
        env:
          TARGET_BRANCH: activity-assets
        run: |
          set -euo pipefail
          temp_dir="$(mktemp -d)"
          cp -a activity-dist/. "$temp_dir/"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null; then
            git fetch origin "$TARGET_BRANCH"
            git switch -C "$TARGET_BRANCH" FETCH_HEAD
            git rm -r --ignore-unmatch . >/dev/null
          else
            git switch --orphan "$TARGET_BRANCH"
          fi
          find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
          cp -a "$temp_dir"/. .
          git add -A
          git commit -m "chore: refresh verified activity charts"
          git push origin "HEAD:refs/heads/$TARGET_BRANCH"
```

Run the workflow once from **Actions → Update activity chart → Run workflow**. It creates `activity-assets` with `activity-30d.svg`, `activity-90d.svg`, `activity-365d.svg`, and the interactive `index.html`.

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

For public contribution activity, the workflow token is usually sufficient. To request broader private/internal visibility, add a repository secret named `DEUS_COMMIT_CHART_TOKEN` containing a GitHub token with access appropriate to the contributions you want GitHub to return. The generated chart contains aggregate daily counts only and never writes private repository names or commit details.

The action only generates files; publishing them is intentionally explicit in the caller workflow. **Release note:** the public `@v1` major tag currently resolves to the signed September 2026 `v1.4.1` release, not to the newer unreleased `main` implementation. See [Marketplace Release Policy](docs/MARKETPLACE_RELEASE_POLICY.md) before adopting new internal features or updating version tags. Its main inputs are `username`, `token`, `default-days`, `ranges`, `theme`, `layout`, `width`, `height`, `hide-border`, and `output-dir`. It also supports `source: local` for workflows that want to chart a checked-out Git repository instead of a GitHub account.

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

The token is read from one of these environment variables, in order:

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

**CI runs only when a PR targets `main`.** The PR-only Smoke workflow tests source code, offline/local Marketplace Action compatibility, 30/90/365 SVG/HTML behavior and rollback. There are **no automatic freshness or README-cache audit workflows**; those diagnostics are available manually, do not create issues and do not run on a schedule. See the [Operations runbook](docs/OPERATIONS.md) for manual usage and failure recovery.

A profile README can embed the default 30-day range directly from the generated branch:

```html
<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart">
    <img src="https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg" alt="GitHub contribution activity for the last 30 days" />
  </a>
</p>
```

The generated `index.html` still contains the interactive 30d / 90d / 365d switcher and can be opened locally from a workflow artifact/checkout. If GitHub Pages is enabled later for the `activity-assets` branch, the same HTML can be served as an interactive public page without changing the generator.

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

The local source reads commit dates from:

```bash
git log --date=short --format=%ad
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

This is contribution-calendar activity, not a raw sum of commits from one repository. GitHub's `contributionCount` can include qualifying commits and other profile contributions such as pull requests, issues, reviews, discussions, repository creation, and similar contribution-calendar events.

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

- a smooth daily activity line and area;
- a dashed 7-day trend;
- activity total;
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

## WSL helper

The existing helper remains available for local repository reports:

```bash
TARGET_REPO=/path/to/git/repo bash run-mia-commit-chart.sh
```

Optional environment variables:

```bash
TARGET_REPO=/path/to/git/repo
BRANCH=main
OUT_FILE=/path/to/output.html
TITLE="Commit activity"
```

The helper derives the Windows Downloads directory dynamically through WSL and does not hardcode a Windows or Linux username.

## Architecture remediation

The architecture audit and remediation work are tracked inside this repository:

- [Architecture Remediation Plan](docs/ARCHITECTURE_REMEDIATION_PLAN.md) — findings, evidence, target design, implementation gates, and acceptance criteria.
- [Remediation Checklist](docs/REMEDIATION_CHECKLIST.md) — actionable verification tasks, release gates, and evidence log.
- [Production Operations and Rollback](docs/OPERATIONS.md) — validation, incident response, release evidence and forward-only rollback.
- [Calendar, Responsive Chart and README Cache Policy](docs/CALENDAR_AND_CACHE_POLICY.md) — UTC source semantics, independently verified series invariants, mobile scrolling and read-only cache measurements.
- [Source Adapters and Rendering Contracts](docs/SOURCE_AND_RENDER_ARCHITECTURE.md) — local Git/GraphQL boundaries, error taxonomy, shared SVG/HTML mathematics and compatibility.
- [CI and GitHub Action Security Review](docs/CI_ACTION_SECURITY_REVIEW.md) — permission boundaries, publication guarantees, compatibility evidence and outstanding supply-chain risks.
- [Marketplace Release Policy](docs/MARKETPLACE_RELEASE_POLICY.md) — current signed `@v1` target, compatibility guarantees and explicit versioned-release approval steps.

Initial data-integrity and publishing fixes shipped on 2026-10-10; additional remediation items remain open until supported by test or release evidence.

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
