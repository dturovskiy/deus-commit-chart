# Changelog

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
