# v1.5.2 candidate — NOT A PUBLISHED RELEASE

> Draft release preparation, 2026-10-11. This candidate is intentionally **not tagged, merged, announced or published to Marketplace** until the original acceptance gates and release review complete. The stable public version remains v1.5.1 and legacy signed `@v1` remains v1.4.1.

## Candidate scope

- Semantic patch version `1.5.2` consistently staged in `package.json`, `package-lock.json`, `CHANGELOG.md`, README badge/Quick Start and optional profile workflow.
- Manual-only real remote-tag consumer workflow staged to invoke `dturovskiy/deus-commit-chart@v1.5.2` **after** the tag is created. Do not run the workflow before the immutable tag exists; a branch-level dry-run tests syntax/fixtures, not actual tag installation.
- New internal snapshot provenance, independently validated real GraphQL candidate, complete fixture/golden regression, shared SVG/browser math, real Chromium 30/90/365 and light/dark theme behavior, user-facing wording on GitHub contributions vs local raw Git commits.
- Maintainer diagnostics remain manual; profile publication remains one trusted six-hour job. No changes to the Action's 15 inputs, 2 outputs, runtime packaging or additional cron jobs.

## Required steps, in dependency order

- [ ] Complete DC-G3-08 direct visual acceptance in [VISUAL_QA_MATRIX.md](VISUAL_QA_MATRIX.md).
- [ ] Record explicitly reviewed dispositions for DC-G2-10 publishing rights and DC-G2-12 GitHub-owned image cache in [TECH_DEBT_REGISTER.md](TECH_DEBT_REGISTER.md); do not claim unmeasured cache SLA or strict write isolation.
- [ ] Pass full PR-only Smoke after all candidate content changes; verify Node + Python suites, real two-theme Chromium, secrets guard, SVG XML, privacy and rollback.
- [ ] Merge this release-candidate branch as a reviewed PR only after the above evidence is complete; verify `main` remains clean/synchronized.
- [ ] Create a **new** annotated `v1.5.2` tag at the tested source commit; do not move or force-update an existing version or signed `v1`.
- [ ] Explicitly dispatch `marketplace-consumer.yml` on `main` **after the new tag exists**, confirm the workflow's two *remote-tag* Action invocations pass (offline local and authenticated GitHub mode) and `LIVE_API_CANDIDATE_PASS` matches all 365 days.
- [ ] Publish the GitHub Release with the Marketplace checkbox/options explicitly checked, compare release tag->source SHA, and verify its listing/actual installation instructions.
- [ ] Verify Marketplace `Use latest version` snippet. If GitHub still serves the signed historical `@v1` alias, **do not describe it as v1.5.2**; an updated signed major tag requires a separately approved controlled tag migration/signing workflow. No destructive shortcut.
- [ ] Record final links/run IDs, post-release README wording, source/manifest SHA, checklist state and any outstanding accepted risks.

## Promotion blockers

At creation time the original checklist reports **62/65**, with G3-08, G2-10 and G2-12 unclosed. This draft is a staging artifact; versioned release promotion must not be mistaken for completing those gates.
