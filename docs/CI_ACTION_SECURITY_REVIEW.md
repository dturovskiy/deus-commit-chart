# CI, GitHub Action and Publication Security Review

> Review date: 2026-10-11. Scope: `action.yml`, `.github/workflows/smoke.yml`, `publish-pages.yml`, source adapters and published-artifact verifier. This is a bounded review, not a third-party security certification.

## Confirmed safeguards

- **Workflow permission boundary (revised 2026-10-11):** PR-only smoke jobs use `contents: read`. The six-hour/manual publisher is **one trusted `main`-only job** with `contents: write` because it commits directly to `activity-assets`. This trades the former two-job permission separation for fewer runner jobs and no intermediate artifact storage; it never executes unreviewed PR code.
- **Publish integrity:** the publisher generates one source snapshot, checks metadata/recomputed snapshot identity/file digests and SVG XML/safety, then creates a **fast-forward-only** commit in `activity-assets` in the same job. No intermediate GitHub Actions artifact is stored. CI regression tests never run inside this scheduled job; the PR-only smoke workflow tests the full Marketplace Action and rollback.
- **Secret boundary:** the composite Action takes the GitHub token through an Actions input/environment variable rather than a command-line argument. The local Git source does not need this token. Public payloads use the `daily-aggregates-only-v1` policy, with restricted/private breakdown fields prohibited by the output verifier.
- **Source isolation:** `source-adapters.js` dispatches GitHub GraphQL and offline Git without coupling either to rendering. Git commands use `spawnSync` with an argument array (no shell), reject ref names starting with a dash, and have 20-second/16 MiB subprocess bounds.
- **Network failure policy:** GitHub requests time out after 15 seconds per attempt by default. Authentication, authorization, malformed JSON and GraphQL response errors do not retry; 429, 5xx, transport and timeouts retry within a bounded attempt budget. `GitHubSourceError` provides stable categories and status/attempt counters without tokens.
- **Compatibility checks:** smoke CI exercises the published composite Action in offline/local mode, CLI HTML/SVG outputs, 30/90/365 SVG integrity, the inline HTML controls, and a forward-only rollback. Real GraphQL canary builds cover the external API separately from local fixtures.

## Evidence

- [PR #7](https://github.com/dturovskiy/deus-commit-chart/pull/7) source refactor merged as `ab272c1d50e72e7bce01b3609100399fbdb7936e`.
- [Feature smoke 38094293267](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094293267): **49 Node tests** and **4 Python tests** passed, composite Action and rollback passed.
- [Feature GraphQL 38094296015](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094296015): real GitHub calendar, HTML and SVG build/verification passed, publish skipped.
- [Production publish 38094426663](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094426663) and [main smoke 38094426657](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094426657): **SUCCESS**.
- [Post-deploy monitor 38094479108](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38094479108): published-asset integrity and freshness verified **SUCCESS**.
- Published manifest `workflowRun=38094426663`, `sourceCommit=ab272c1d50e72e7bce01b3609100399fbdb7936e`, `snapshotId=5e236808b8452d099416b06c3ab71e391457610690be0118f7dfe1b909dc61f6`, generated at `2026-10-10T23:16:12.605Z`. HTML and SVG were inspected directly via DEUS MCP; numbers 30d=228, 90d=789, 365d=3074 at snapshot time.

## Residual risks and accepted limitations

- **Supply chain (fixed for current `main`):** upstream `actions/checkout` is pinned to `11d5960a326750d5838078e36cf38b85af677262` (v4.4.0) and `actions/setup-node` to `49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0) everywhere including the composite Action. Upstream tags/releases and independently pinned workflows establish the revisions. Update these full SHA references deliberately through a reviewed PR with a full smoke run. **Remaining consideration:** these major-v4 actions use an older Node action runtime; a future migration to a newer major must be tested before GitHub retires support.
- **P2 browser realism (OPEN):** inline script behavior is tested in a controlled JS VM, not across all real browsers/devices. The design is unchanged; no claim of universal visual parity.
- **Evidence retention:** the simplified publisher uploads **no** Actions artifacts; every published snapshot remains recorded in the fast-forward `activity-assets` branch and its manifest. Previously uploaded artifacts still exist until their original retention expires, and historic public metadata in old commits/caches cannot be silently erased.
- **Separate public-visibility trade-off:** GitHub-sourced daily contribution totals can include token-visible private contributions; the private/restricted breakdown itself is not requested or published.
- **Observability:** the publisher is scheduled every six hours; GitHub may delay scheduled jobs and README image caching remains independent. Optional cache and health audits are manually dispatched only; no automated incident issues are created. Repeated validated snapshots from the *same source SHA* do not create a new `activity-assets` commit; the previously published timestamp is preserved to reflect the last data change. New code always republished. The Marketplace `@v1` tag remains on the September signed release pending explicit versioned release approval.
