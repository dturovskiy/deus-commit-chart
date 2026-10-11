# Source Adapters and Rendering Contracts

> Architecture notes for the 2026-10-11 source/render refactor. The public artifact schema stays at version 1; changes here are internal.

## Pipeline

```text
single-file CLI ──┐
                   ├─> source-adapters.loadContributionSource({source,...}, {asOf})
batch publisher ──┘       ├─> contribution-snapshot.fetchGithubDailyCounts
                           └─> local-git-source.readLocalGitDailyCounts
                                    |
                       normalized source data + frozen internal ContributionSnapshot v1
                                    |
                   validate snapshot schema, quality and SHA-256 identity
                                    |
                       buildSeries + createMeta
                                    |
                         chart-contract validation
                                    |
                     modern-renderer (SVG + HTML)
                                    |
                  manifest, checksums, independent verifier
```

- **Source adapters** only collect data. Neither module creates HTML, SVG, or publication commits.
- GitHub GraphQL uses one HTTP POST with a primary and boundary-calendar alias, frozen `asOf`, strict calendar coverage, no private contribution breakdown fields and no client-supplied token in any published artifact.
- Local Git uses `git log --format=%aI`, groups authors' timestamp instants into UTC days and discards out-of-window commits. Its subprocess has a bounded 20-second timeout and 16 MiB stdout/stderr buffer; it requires no GitHub token or network. Invalid option-like revision names, timestamp formats and subprocess errors fail closed.
- The shared router validates source and frozen clock and is used by both CLI entry points. The compatibility exports `readLocalGitDailyCounts` and `readGithubDailyCounts` in `generate-commit-chart.js` remain available.
- A source's `counts` map contains observed non-zero days (local mode) or a fully validated 365-day calendar (GitHub mode). A [versioned, frozen `ContributionSnapshot` v1](CONTRIBUTION_SNAPSHOT_CONTRACT.md) then verifies source identity, complete trailing-365-day UTC sequence and normalized per-day values. Local missing commit dates become inferred zeros with an explicit quality flag; GitHub missing dates are **never** silently synthesized from an incomplete API response. HTML/SVG and manifest are derived from the same frozen snapshot without changing their public schema.
- The public chart still has daily contributions, totals, 7-day averages, timestamp and snapshot identity. No breaking change to the manifest, HTML payload or static SVG file names.

## Source error taxonomy

The GitHub adapter throws `GitHubSourceError` (extends `Error`) for request/HTTP/JSON/GraphQL failures. It includes `code`, HTTP `status` when available, and number of `attempts`, without revealing tokens. Codes:

| Code | Cases | Retry |
|---|---|---|
| `authentication` | HTTP 401 | No |
| `authorization` | HTTP 403 | No |
| `rate_limited` | HTTP 429 | Yes, bounded |
| `server_error` | HTTP 5xx | Yes, bounded |
| `http_client_error` | Other HTTP client failures | No |
| `malformed_json` | Invalid JSON response | No |
| `graphql_error` | GraphQL `errors` response | No |
| `network_error` | Transport failures | Yes, bounded |
| `timeout` | Aborted after request timeout | Yes, bounded |

The default GitHub policy is three attempts with 15-second per-attempt timeout and bounded backoff; local-Git errors are separate subprocess errors. The scheduled publisher deliberately fails if the source fails, preserving the last good `activity-assets` commit.

## Shared static/interactive chart mathematics

`modern-renderer.js` owns the **same pure functions** used by both output formats: `isoToUtcMs`, `formatDate`, `selectRange`, `smoothPath`, `dailyBarRects`, `chartGeometry`, and `buildTicks`. The HTML embeds the function bodies generated from this same source, avoiding a second browser-only implementation of range selection, bar positions, trend interpolation, or axis ticks. The generator re-exports the renderer's `selectRange` for compatibility.

The browser still owns DOM updates and tooltip controls; static SVG remains script-free. `test/browser.test.js` executes the real generated inline script in a VM and compares its daily-bar markup, blue trend `d` path and tick labels against the static SVG for all 30/90/365 ranges. Independent contract tests verify the underlying series, metadata and source snapshot identity.

## Operations and compatibility

- `npm run check`: syntax and Node regression tests. `npm test`: canonical test suite. GitHub Actions also checks the composite local-Git Action, live GraphQL canary build, XML safety and rollback rehearsal.
- Branch validation never publishes to production; only successful verified `main` build/publish can update `activity-assets`.
- GitHub's `contributionCalendar` may reflect account-private activity depending on the token. Local Git counts only commits in the selected ref and optional author filter.
- No visual redesign is introduced in this refactor. The chart remains daily green bars plus one blue seven-day moving-average line.
