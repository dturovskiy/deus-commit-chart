# 2026-10-11 — Release risk disposition (reviewable decision, not a bug fix)

> Scope: `dturovskiy/deus-commit-chart` at `main=cded31577e5eb25d6b4aff8c1dd4fbb8de9caecf`. This is a documented **operational acceptance** of the two residuals under the previously chosen minimal-job, manual-only release policy. It does **not** claim a human signature, strict technical isolation or a measured GitHub image-cache TTL. Review again when the explicit triggers below occur.
>
> Existing user-directed constraints: preserve one six-hour publisher job, no additional scheduled CI/monitoring or automatic incident issues, defer `main` protection, avoid force-updating signed `v1`. Both decisions here implement the previously requested lean-operation trade-off and release-readiness plan. The visual review gate **DC-G3-08 is not waived**.

## Decision A: DC-G2-10 — accept residual write scope, evidence verified

**Original goal:** minimum-necessary publishing credentials, including redaction from output/logs. **Implemented safeguards:**
- PR-only Smoke has `contents: read`; only the one trusted, `main`-only, six-hour/manual publisher has `contents: write`.
- `actions/checkout` is full-SHA pinned and uses `persist-credentials: false`; no checkout write token persisted to Git config.
- The last publishing step alone receives `GH_TOKEN: github.token`; a transient `!gh auth git-credential` helper authorizes its fast-forward Git push without storing the token in the remote URL or printing it in command arguments.
- GraphQL ingestion happens once, builds frozen data and independently verifies HTML/SVG, SHA-256 manifest and XML safety before any push. A failure retains the previous published assets; no force push or uploaded artifacts.
- **Direct proof:** [PR #28 green Smoke #38148588645](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148588645), merged at `cded315`. [Actual postmerge production #38148635625](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148635625) **SUCCESS** and fast-forward pushed `activity-assets` commit `03d17c5`. Manifest `sourceCommit=cded315`, 365 days, 30/90/365 totals `269/832/3132`. No exposed credential seen in bounded workflow-log inspection.

**Residual not fixed:** job-level `contents: write` lasts for the whole job; the source fallback `github.token` can also receive the same write-capable token, even though publication token injection is limited to the final step. A separate read-only fetch job and short-lived publish credential would narrow privilege more but add jobs, transfer/verification and complexity.

**Reviewed release acceptance boundary:** within the agreed one-job, no-additional-runner architecture, treat the audited safeguard configuration and successful real write-path proof as sufficient *operational risk disposition* of the original G2-10 gate—not as proof of strict least privilege. Keep the gap visible in [TD-04](TECH_DEBT_REGISTER.md) and [security review](CI_ACTION_SECURITY_REVIEW.md). Do not broaden third-party code execution or runtime dependencies without reconsidering this decision.

**Reopen on:** compromised Action/credential incident, new third-party build step, extra maintainer with write access, policy change requiring strict least privilege, or approved isolation/extra job.

## Decision B: DC-G2-12 — accept bounded empirical observations without inventing a cache SLA

**Original goal:** measure real GitHub README image lag and cache behavior without claiming immediate invalidation. **Evidence:**
- Actual profile HTML was fetched; its image source was `raw.githubusercontent.com` and the published `activity-assets` manifest/SVG were independently checked. Independent `camo.githubusercontent.com` image proxy **not observed**.
- Point-in-time matches after earlier publishes: snapshot age `19.80, 25.72, 28.47, 36.77` seconds. Each confirms the image was current at that instant, **not** when cache became fresh.
- After [production #38146164226](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38146164226), [three-sample audit #38146191299](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38146191299) returned `profile_raw_matched` at `24.38, 40.21, 55.63` seconds.
- After the new authenticated production push [#38148635625](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148635625), [three-sample audit #38148744110](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148744110) returned `profile_raw_matched` at `99.15, 115.00, 130.79` seconds. [Manual freshness #38148748412](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148748412) was also successful.
- Both three-sample audits explicitly reported `observedTransitions=[]`, `independentImageProxyObserved=false`, `cacheSlaEstablished=false`.

**Residual not fixed:** a real stale→fresh transition and browser/mobile/camo invalidation upper bound have **not** been observed. A raw HTTP `Cache-Control: max-age=300` does not certify a universal five-minute end-user refresh limit. GitHub owns all image proxy/cache behavior.

**Reviewed alternative acceptance boundary:** repeated controlled post-publish measurements confirm accurate image when observed, and the present absence of observable lag is honestly recorded; G2-12 measures empirical behavior and documents the unknown upper bound rather than requiring an impossible invented SLA. Treat the measurement and external-ownership limitation as an *accepted operational disposition*, **not** evidence of a quantified maximum delay. Keep [TD-05](TECH_DEBT_REGISTER.md) open for renewed measurement on an actual stale-image incident.

**Reopen on:** user-reported stale chart, actual observed stale→fresh transition, GitHub image-host change, or product requirement for a contractual upper bound. Continue *manual-only* `samples=1|3` observations, no scheduled polls or cache-busting.

## Release constraints, ownership and truthfulness

- These accepted residuals remain open in the **living debt register**; marking the **two original acceptance gates** complete records *reviewed disposition*, not elimination of the underlying residual risk.
- DC-G3-08 **remains open** until the direct [visual QA review sheet](VISUAL_QA_MATRIX.md) contains actual visual inspection evidence. CI-only Chromium and contrast tests do not replace it.
- Next stable GitHub release, major-tag migration, Marketplace install-button verification and release checkboxes remain separate. This document does not grant force-push authority for signed `v1`, claim an unperformed human visual review or advance a release tag.
- Reevaluate the risk decisions when any listed trigger occurs, or during the next release where the publisher's architecture/credential boundary changes.
