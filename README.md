# Deus Commit Chart

Standalone HTML commit activity chart generator for a local Git repository.

It reads `git log` from a repository you already have on disk and writes a self-contained HTML report. The generated report is an output artifact and should not be committed.

## Usage

```bash
node generate-commit-chart.js \
  --repo /path/to/git/repo \
  --branch main \
  --out commit-chart.html \
  --title "Commit activity"
```

Then open `commit-chart.html` in a browser.

## WSL helper

For the author's WSL workflow there is a convenience runner:

```bash
TARGET_REPO=/path/to/git/repo bash run-mia-commit-chart.sh
```

The runner derives the Windows Downloads directory dynamically through WSL. It does not hardcode a Windows username or Linux username.

Optional environment variables:

```bash
TARGET_REPO=/path/to/git/repo
BRANCH=main
OUT_FILE=/path/to/output.html
TITLE="Commit activity"
```

## What is generated

The HTML report includes:

- cumulative commits;
- daily commits;
- 7-day moving average;
- date range and summary metrics.

## Development

```bash
npm run check
```

## Privacy

The tool reads only local Git metadata from the repository path you provide. It does not contact GitHub or any external service.
