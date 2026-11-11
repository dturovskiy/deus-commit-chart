# DEUS Commit Chart Live — self-hosted experiment

**Draft only. Not deployed. No user-facing endpoint or README change.**

This is part of **DEUS Commit Chart**, not a new product or a separately
installed client app. The Live HTTP server runs on built-in Node.js
`node:http` with **no extra npm dependencies**, using the exact existing
`loadContributionSource` / `createAssetBundle` generation pipeline.

The program binds **127.0.0.1 only** (default port 8787). A separately
reviewed `deus-gateway` nginx/Caddy reverse-proxy route can expose it over
HTTPS in our own infrastructure when a stable always-on host is available.
GitHub Pages can host static files, not this long-running endpoint.

## Endpoint contract

- `GET /api/chart?username=USERNAME&days=365`
- `days`: 30 (default), 90, 365
- `theme`: `github-compact` (default), `github-light`
- `GET /healthz`: local health only; does not reveal credentials
- 200: verified standalone `image/svg+xml`, ETag and
  `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600`
- 304: conditional ETag hit
- 400/405: invalid input/method; 503: missing service credential or busy;
  502: upstream GitHub errors
- Unknown or duplicated query parameters are rejected. No user-supplied
  API hostname, upstream URL, code execution or filesystem path is accepted.
- Fresh in-memory cache is 5 minutes (up to 64 variants), with bounded
  in-flight calls and a validated 30-minute stale-on-upstream-failure fallback.
- No background cron, worker timer, automatic git commit or write to disk.
  The cache is per process; it is **not a global distributed cache**.

## Local/offline development

Run the full Node test suite (which mocks GitHub):

```bash
node --test test/live-chart-endpoint.test.js test/live-chart-server.test.js
npm run check
npm test
```

The server process **will not start** unless `DEUS_CHART_LIVE_TOKEN` is
provided through its private environment. It never prints the value.
An authorized maintainer can run `node live-chart/server.js` with that
environment variable already configured; `DEUS_CHART_PORT` optionally
sets a strictly validated listening port (default 8787).

Example health probe on the same host:

```bash
curl --fail --silent http://127.0.0.1:8787/healthz
```

Do not copy credentials to shell history, git, README, public client URLs,
or remote `gh` Actions secrets. Do not forward GitHub CLI's OAuth token.
A carefully restricted **single service-side** GitHub GraphQL credential
is needed for public calendar queries, but visitors require no credential,
GitHub App or PAT. Before enabling public access, prove that the service
account cannot see private/internal contribution data.

## Release gates (all pending)

1. Identify an **existing, reliably online** DEUS host/VM; a local WSL
   session is not an uptime solution for a public README chart.
2. Install Node.js 22 runtime with this repository code in an isolated
   unprivileged service account and protect the environment file.
3. Configure and review HTTPS reverse proxy through `deus-gateway`:
   only `GET /api/chart` is exposed; apply per-IP rate limits, body-size,
   connection and timeout limits, egress control and monitoring. Do not
   expose port 8787 directly to the internet.
4. Verify GitHub rate-limit budget, public-only GraphQL authentication,
   denial-of-service behavior, caching behavior, audit trails and isolation.
5. Test a **preview HTTPS URL** with real GitHub GraphQL and multiple
   accounts. Compare against static SVG, validate 30/90/365 day totals.
6. Confirm actual GitHub Camo behavior in a separate profile README
   Draft PR. The existing static image remains in place.
7. Only after demonstrated stable operation, consider a public release
   or Marketplace documentation. Do not remove current cron/publisher.

**Limitations:** request-driven generation cannot guarantee a fresh image
the moment an upstream contribution occurs; GitHub may recompute the
calendar later and its README Camo proxy can serve cached images. This
service cannot guarantee a five-minute user-visible update SLA.

**Rollback:** close Draft PR #44 and optionally delete its experimental
branch. No release tag, default branch, hosting, current README, Actions
consumer or existing SVG assets are changed by this experiment.
