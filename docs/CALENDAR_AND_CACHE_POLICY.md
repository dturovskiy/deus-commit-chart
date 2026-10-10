# Calendar, Rendering, and README Cache Contract

> Scope: Deus Commit Chart HTML, SVG, GitHub GraphQL and local Git modes. The format remains `schemaVersion: 1` with explicit `daily-aggregates-only-v1` public-data policy.

## Calendar dates and timezone policy

- Each build freezes one `asOf` instant; the **end date is its UTC calendar day**, and the full snapshot spans exactly 365 consecutive UTC dates including today.
- Daily GitHub counts are preserved **under the exact `contributionDay.date` returned by GitHub**. The code never converts GitHub's day label to the CI runner's or browser's local time. A trailing-year request includes a shorter boundary collection alias in the same GraphQL HTTP request. Only dates matching the frozen UTC display window are retained, and missing dates fail closed.
- **GitHub's account contribution-calendar semantics are owned by GitHub.** A user's GitHub-account timezone/contribution settings can differ from this UTC display window; values may update after a day's UTC boundary. Do not claim strict parity between a local clock and GitHub's contribution-day rollover.
- The **local Git source buckets each commit's strict ISO author timestamp as a UTC day**, ignoring the runner's timezone. This is a behavioral clarification versus the former author-local `--date=short` grouping: commits near local midnight can move by one calendar day. The UTC policy makes local Git and GitHub-range selection deterministic for independently located runners.
- Daily bars are exact observations, including genuine zero days. The last UTC day is marked **partial** because new contributions can still arrive. A **7-day trend** uses the current day and up to 6 preceding observations, and the stored moving average is rounded to 2 decimal places.
- Do not convert dates by adding/subtracting 24 hours in a *local* timezone. Date arithmetic uses UTC midnight and a fixed 86,400,000 milliseconds; DST changes do not create 23- or 25-hour chart days.

## Versioned data validation

- The builder and independent publication verifier both execute `validateContributionSeries` from `chart-contract.js`.
- Enforced invariants: **365 days**, valid ascending contiguous dates, non-negative safe-integer daily counts, exact cumulative values, exact trailing 7-day moving average, total/active-day parity, `generatedAt` UTC day consistency, and a SHA-256 `snapshotId` re-derived from the actual series.
- Asset SHA-256 checksums are separate from the snapshot identity. Recomputing a tampered HTML asset checksum alone can no longer bypass the numerical contract.
- The source account, `generatedAt`, snapshot ID and chart counts are public. Restricted/private breakdowns and private source repository details are not serialized. See `PRIVACY.md` for limitations.

## Narrow-screen readability

- On screens up to 820 CSS pixels wide the HTML chart is **horizontally scrollable** and maintains the configured SVG-native width. The viewport initially shows the **latest days on the right** rather than compressing 365 daily bars into sub-pixel slivers.
- The chart scroll area is keyboard focusable (`tabindex=0`), region-labeled, has a visible focus ring, and includes a swipe/scroll hint. Each 30d/90d/365d switch returns to the latest segment.
- The standalone README SVG remains static, independent of JS or CSS viewport detection. GitHub's README image embed may downscale it; the full-size HTML provides accessible exploration.
- Contrast values for both built-in chart themes are tested at WCAG AA **4.5:1 minimum** for text, muted labels, daily green and 7d blue over the background. Responsive CSS/DOM checks are automated; **manual device/browser visual QA remains separate**.

## GitHub README image-proxy cache

- The true publication ref is `activity-assets`; its validated `manifest.json` and HTML/SVG files are authoritative. GitHub may render the profile image through `camo.githubusercontent.com`, with a different cache lifecycle.
- `.github/workflows/audit-readme-cache.yml` runs read-only measurements after scheduled publication and supports manual dispatch. Its Python probe records the **published snapshot**, direct raw SVG snapshot, and rendered **profile image proxy snapshot** (when accessible) plus bounded HTTP metadata, to a retained JSON artifact.
- Observations are `matched`, `proxy_lag_observed`, `inconclusive`, or `probe_unavailable`. A single observation establishes neither a maximum TTL nor a refresh service-level agreement. Multiple observations after distinct publishes are required to estimate observed lag.
- The probe does not reset/bust caches, rewrite the profile README or alter either repository. Its HTTP access is restricted to known GitHub raw/profile/proxy domains. A failed probe is **non-blocking** and must not trigger a production rollback or stale-data incident by itself.
- The normal freshness monitor independently validates the published branch; it **does not** claim that a user's browser has refreshed its cached README thumbnail.
