# Live SVG endpoint — isolated experiment

**Status: Draft experiment only. Not deployed; not a user-facing URL.**

This additive proof of concept uses the existing `loadContributionSource` and
`createAssetBundle` pipelines. It does **not** change the existing Marketplace
composite Action, any GitHub Actions trigger, README, release tag or published
`activity-assets` branch.

## HTTP contract (once explicitly deployed)

- `GET /api/chart?username=USERNAME&days=365`
- `days`: 30 (default), 90, 365
- `theme`: `github-compact` (default), `github-light`
- 200: validated standalone `image/svg+xml`, ETag, `Cache-Control:
  public, max-age=0, s-maxage=300, stale-while-revalidate=600`
- 304: conditional ETag hit; 400/405: rejected input; 503: missing service
  credential or saturated backend; 502: upstream errors.
- Query parameters other than the three supported inputs are rejected to
  prevent cache-key amplification.
- Existing verified SVG may be served up to 30 minutes stale during upstream
  failures; a stale response is marked `X-Deus-Chart-Cache: STALE`.
- A bounded in-memory per-instance cache and in-flight coalescing are included,
  but **they are not a global distributed cache**.
- No timer, background poll, automatic commit or filesystem write.

## Prerequisites before any production hosting

1. Explicitly choose and configure a serverless provider with durable, shared
   cache/rate limits for a public endpoint; this experiment intentionally does
   **not** create or deploy a hosting account.
2. Supply the **server-side only** `DEUS_CHART_LIVE_TOKEN` with the least
   privileges needed for public contribution-calendar reads. The token is
   required by GitHub GraphQL; never expose it to browsers, README URLs,
   Action inputs, logs, or any client-facing error. No user token is required
   for the default public-only Live mode.
3. Confirm dedicated read credentials cannot expose non-public contribution
   activity, including accounts with private collaborations.
4. Introduce provider-side abuse controls, rate limiting and observability
   before broad public release. Memory caching does not provide cross-instance
   throttling. GitHub API limits and external costs need a measured budget.
5. Verify end-to-end UTC boundary accuracy, HTTP content type, ETag behavior,
   Camo image proxy/cache lag, multiple user accounts and privacy policy.
6. Deploy to a preview URL first, independently verify, then consider a
   documented opt-in Live option for the Marketplace. The offline Action
   remains supported and is not switched over automatically.

## Local verification

```bash
node --test test/live-chart-endpoint.test.js
npm test
npm run check
```

The default export of `api/chart.js` follows the Vercel Node.js HTTP
function convention and is inert without a separate deployment. It needs
Node.js 22 or later at the hosting provider.

**Freshness**: a request-driven cache expiry is not a timer-based job. Neither
GitHub GraphQL recomputation nor GitHub's Camo image caching offers an
instantaneous freshness SLA. Do not market as live-to-the-second.

**Rollback**: close the Draft PR to discard the experiment. No stable branch,
published SVG, secret, Marketplace listing or existing workflow needs to be
rolled back; none of these are modified by the experiment.
