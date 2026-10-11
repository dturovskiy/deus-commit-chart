# ContributionSnapshot — internal v1 contract

A single canonical **`ContributionSnapshot`** is constructed from either source adapter and validated again at the batch-asset rendering boundary. Its schema is **internal**: the public chart HTML, SVG, `manifest.json`, and Marketplace Action inputs/outputs are unchanged.

```js
{
  schemaVersion: 1,
  snapshotId: '<sha256 hex: canonical source, date window and daily counts>',
  asOf: '2026-10-10T14:03:01.000Z',
  source: { type: 'github', username: 'example' },
  // or: { type: 'local', repo: 'repo-name', branch: 'main', author: null }
  calendar: { startDate: '2025-10-11', endDate: '2026-10-10', days: 365 },
  quality: {
    complete: true,
    expectedDays: 365,
    observedDays: 365, // normalized output includes zero-activity days
    missingDays: 0,
    currentDayPartial: true,
    localZeroDaysInferred: false
  },
  days: [
    { date: '2025-10-11', contributions: 0 },
    // ... exact trailing 365 UTC days ...
    { date: '2026-10-10', contributions: 15 }
  ]
}
```

## Invariants

- `schemaVersion: 1` is explicit; unsupported schema versions are rejected.
- `snapshotId` reuses the **existing** public SHA-256 identity formula from `contribution-snapshot.js`, keeping old snapshot identity and README/SVG hashes compatible.
- `asOf` is an exact UTC ISO 8601 timestamp. The calendar is exactly 365 consecutive valid Gregorian UTC dates ending on the UTC date of `asOf`.
- GitHub responses **must** contain all 365 observed dates, including zero-contribution days. A missing/duplicate date, negative/fractional/unsafe count, or inconsistent source name fails before rendering.
- In local Git mode, dates not found in `git log` are explicitly interpreted as zero activity; `localZeroDaysInferred: true` records this origin rule. `observedDays` is the length of the normalized chart calendar, not the count of nonzero days.
- The `source` object uses an **allowlist**. GitHub only keeps `username`; restricted/private aggregate breakdowns, raw authentication tokens, arbitrary GraphQL payload fields and repository identities are not copied into the snapshot.
- Objects, calendar, quality, daily points and the daily array are frozen. Rendering regenerates the mutable working count Map **from the frozen snapshot**. Mutation of an upstream source Map cannot silently change an already identified build.
- `validateContributionSnapshot()` independently reconstructs and compares the full canonical representation, including `quality`, date sequence, data and snapshot identity. An inconsistent snapshot fails before publication.
- This contract is used by `loadContributionSource()` and `createAssetBundle()`; a standalone single-file CLI shares the same source adapters. No new scheduled check or publishing credential is required.

## Proof and future migration

`test/contribution-snapshot-model.test.js` tests immutability, privacy allowlists, malformed ranges/days, tampering, GitHub completeness, local inferred zero days, stable public ID and identical assets after upstream Map mutation. Existing SVG full-content goldens and HTML manifest/verifier tests must continue to pass **unchanged**.

Any future schema v2 requires an explicit migration and separately versioned hash semantics. Do not silently change public HTML/manifest fields or Marketplace consumers.
