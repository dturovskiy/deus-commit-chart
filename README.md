# Deus Commit Chart

Activity chart generator for local Git repositories and GitHub contribution calendars.

It can produce:

- an interactive, self-contained HTML report with **30d / 90d / 365d** switching;
- a static, script-free SVG suitable for GitHub profile READMEs;
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

`--days` selects the initially active range. The other ranges remain available in the generated HTML.

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

Use `--hide-border` for a borderless SVG.

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

The GitHub source requests the trailing 365-day contribution calendar once during generation. The generated HTML or SVG does not contact GitHub afterward.

## GitHub Pages publishing

The repository includes `.github/workflows/publish-pages.yml`. On `main`, it can publish:

```text
/index.html
/activity-30d.svg
/activity-90d.svg
/activity-365d.svg
```

The HTML page is interactive and switches between 30d, 90d, and 365d in the browser. The SVG files are static and intended for README embedding.

For `dturovskiy/deus-commit-chart`, the resulting targets are intended to be:

```text
https://dturovskiy.github.io/deus-commit-chart/
https://dturovskiy.github.io/deus-commit-chart/activity-30d.svg
https://dturovskiy.github.io/deus-commit-chart/activity-90d.svg
https://dturovskiy.github.io/deus-commit-chart/activity-365d.svg
```

GitHub Pages must be configured to use **GitHub Actions** as the deployment source. The workflow rebuilds on relevant `main` changes, every six hours, and on manual dispatch.

A profile README can embed one static range and make the image open the interactive report:

```html
<p align="center">
  <a href="https://dturovskiy.github.io/deus-commit-chart/">
    <img src="https://dturovskiy.github.io/deus-commit-chart/activity-90d.svg" alt="GitHub contribution activity" />
  </a>
</p>
```

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

This is contribution-calendar activity, not a raw sum of commits from one repository.

## Output metrics

The HTML report includes:

- daily activity;
- cumulative activity inside the selected range;
- 7-day moving average;
- active-day count;
- peak day;
- exact calendar range.

The SVG includes:

- daily activity line and area;
- 7-day moving average;
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
