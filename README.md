# Deus Commit Chart

Activity chart generator for local Git repositories and GitHub contribution calendars.

It can produce:

- an interactive, self-contained HTML report with **30d / 90d / 365d** switching that rebuilds the chart as SVG in-browser;
- a smooth, static, script-free SVG suitable for GitHub profile READMEs;
- data from a local `git log` or from GitHub's GraphQL contribution calendar.

No charting library or runtime web service is required for the generated output.

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

Use `--hide-border` for a borderless SVG. Daily activity is rendered as a restrained smooth curve with a fading area fill; the blue dashed `7d trend` is the 7-day moving average. Curve control points are clamped to adjacent data values so smoothing does not create artificial overshoot between daily points.

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

The GitHub source requests the trailing 365-day contribution calendar once during generation. The generated HTML or SVG does not contact GitHub afterward. The published `activity-assets` branch is refreshed every six hours (and on relevant pushes/manual dispatch), so the README chart is normally at most about six hours behind GitHub's contribution calendar.

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

The workflow rebuilds on relevant `main` changes, every six hours, and on manual dispatch. It force-refreshes only the generated `activity-assets` branch; `main` stays free of generated chart commits.

A profile README can embed the default 90-day range directly from the generated branch:

```html
<p align="center">
  <a href="https://github.com/dturovskiy/deus-commit-chart">
    <img src="https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-90d.svg" alt="GitHub contribution activity" />
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

Private/internal repository activity has an additional visibility rule. GitHub's GraphQL documentation states that private and internal contributions are included only when the token has the optional `read:user` scope. GitHub also only exposes anonymized restricted contribution counts when the account has enabled **Private contributions** in profile contribution settings. The default Actions `github.token` is repository-scoped and should therefore be treated as a public contribution view; use a user-authorized `DEUS_COMMIT_CHART_TOKEN` with the required scope if private/internal counts should be included. Repository names and private details are never written to the chart—only daily counts are used.

The GraphQL query also records `restrictedContributionsCount` and `hasAnyRestrictedContributions` in the embedded metadata, so the interactive report can tell whether GitHub actually returned anonymized private/internal counts.

## Output metrics

The HTML report includes:

- a smooth daily activity SVG with a fading area fill;
- a dashed `7d trend` (the 7-day moving average);
- instant 30d / 90d / 365d in-browser SVG rebuilding;
- active-day count;
- peak day;
- data freshness and private-count visibility metadata;
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

## Development

```bash
npm ci
npm test
npm run check
```

The smoke workflow validates both the interactive HTML range controls and static SVG output for 30d, 90d, and 365d.

## Privacy

With the default `--source local`, the tool reads only local Git metadata and makes no network requests.

With `--source github`, the tool contacts only the GitHub GraphQL API during generation using the token supplied through the environment. Generated HTML and SVG artifacts are self-contained and make no subsequent API calls.
