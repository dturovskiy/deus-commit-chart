# v1.5.2 candidate — NOT A PUBLISHED RELEASE

> Draft release preparation, 2026-10-11; refreshed after security/acceptance PRs #28–#29. This candidate is intentionally **not tagged, merged, announced or published to Marketplace** until the last original acceptance gate (G3-08) and release review complete. The stable public version remains v1.5.1 and legacy signed `@v1` remains v1.4.1.

## Candidate scope

- Semantic patch version `1.5.2` consistently staged in `package.json`, `package-lock.json`, `CHANGELOG.md`, README badge/Quick Start and optional profile workflow.
- Manual-only real remote-tag consumer workflow staged to invoke `dturovskiy/deus-commit-chart@v1.5.2` **after** the tag is created. Do not run the workflow before the immutable tag exists; a branch-level dry-run tests syntax/fixtures, not actual tag installation.
- New internal snapshot provenance, independently validated real GraphQL candidate, complete fixture/golden regression, shared SVG/browser math, real Chromium 30/90/365 and light/dark theme behavior, user-facing wording on GitHub contributions vs local raw Git commits.
- Maintainer diagnostics remain manual; profile publication remains one trusted six-hour job. No changes to the Action's 15 inputs, 2 outputs, runtime packaging or additional cron jobs.

## Required steps, in dependency order

- [ ] Complete DC-G3-08 direct visual acceptance in [VISUAL_QA_MATRIX.md](VISUAL_QA_MATRIX.md). **Actual desktop Marketplace and mobile GitHub profile screenshots have now been reviewed** in [VISUAL_QA_SCREENSHOT_FINDINGS.md](VISUAL_QA_SCREENSHOT_FINDINGS.md). Both show the 30-day bars/trend without clipping, but the 1120-wide static SVG scales its metadata, dates and legend to very small text on iPhone. This finding must be remediated or explicitly reviewed as an acceptable zoom-to-read limitation; the screenshots do not establish light theme, interactive HTML or 90/365 human visual coverage. Do not complete G3-08 or promote this release solely from passing Chromium assertions.
- [x] Record reviewed operational dispositions for DC-G2-10 publishing rights and DC-G2-12 GitHub-owned image cache in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md), with ongoing risks tracked in [TECH_DEBT_REGISTER.md](TECH_DEBT_REGISTER.md). The real publisher [#38148635625](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148635625) and cache probe [#38148744110](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148744110) passed; neither strict job-level write isolation nor a cache TTL is asserted.
- [ ] Pass full PR-only Smoke after all candidate content changes; verify Node + Python suites, real two-theme Chromium, secrets guard, SVG XML, privacy and rollback.
- [ ] Merge this release-candidate branch as a reviewed PR only after the above evidence is complete; verify `main` remains clean/synchronized.
- [ ] Create a **new** annotated `v1.5.2` tag at the tested source commit; do not move or force-update an existing version or signed `v1`.
- [ ] Explicitly dispatch `marketplace-consumer.yml` on `main` **after the new tag exists**, confirm the workflow's two *remote-tag* Action invocations pass (offline local and authenticated GitHub mode) and `LIVE_API_CANDIDATE_PASS` matches all 365 days.
- [ ] Publish the GitHub Release with the Marketplace checkbox/options explicitly checked, compare release tag->source SHA, and verify its listing/actual installation instructions.
- [ ] Verify Marketplace `Use latest version` snippet. If GitHub still serves the signed historical `@v1` alias, **do not describe it as v1.5.2**; an updated signed major tag requires a separately approved controlled tag migration/signing workflow. No destructive shortcut.
- [ ] Record final links/run IDs, post-release README wording, source/manifest SHA, checklist state and any outstanding accepted risks.

## Promotion blockers

As verified after PR #29, the original checklist reports **64/65**: G2-10 and G2-12 received evidence-backed operational dispositions, while their actual residuals stay in the debt register. **G3-08 human visual acceptance is still open.** This draft is a staging artifact; passing CI and preparing a version do not close visual acceptance or promote a release.
