# v1.5.2 candidate checklist — archived after publishing

> **Archived preparation record.** The v1.5.2 source PR, immutable tag, exact remote-tag consumers and stable GitHub Release are **completed**; see [final release verification report](RELEASE_V1_5_2_REPORT.md). The **Marketplace listing/button remains unverified**, so TD-01 stays open. The previously signed major `@v1` still targets legacy v1.4.1.

## Candidate scope

- Semantic patch version `1.5.2` consistently staged in `package.json`, `package-lock.json`, `CHANGELOG.md`, README badge/Quick Start and optional profile workflow.
- Manual-only real remote-tag consumer workflow staged to invoke `dturovskiy/deus-commit-chart@v1.5.2` **after** the tag is created. Do not run the workflow before the immutable tag exists; a branch-level dry-run tests syntax/fixtures, not actual tag installation.
- New internal snapshot provenance, independently validated real GraphQL candidate, complete fixture/golden regression, shared SVG/browser math, real Chromium 30/90/365 and light/dark theme behavior, user-facing wording on GitHub contributions vs local raw Git commits.
- Maintainer diagnostics remain manual; profile publication remains one trusted six-hour job. No changes to the Action's 15 inputs, 2 outputs, runtime packaging or additional cron jobs.

## Required steps, in dependency order

- [x] DC-G3-08 **scoped** visual acceptance after user-provided desktop Marketplace screenshot, normal and enlarged iPhone profile screenshots, and explicit user confirmation that zoom-to-read metadata is acceptable. 30/90/365 dark/light interactive HTML and contrast/accessibility are separately validated in real Chromium CI. [Evidence scope](VISUAL_QA_MATRIX.md), [screenshot review](VISUAL_QA_SCREENSHOT_FINDINGS.md). Other physical browsers/themes lack direct human screenshots and remain **TD-12**, not fabricated manual coverage. No SVG redesign required.
- [x] Record reviewed operational dispositions for DC-G2-10 publishing rights and DC-G2-12 GitHub-owned image cache in [RELEASE_RISK_DECISIONS.md](RELEASE_RISK_DECISIONS.md), with ongoing risks tracked in [TECH_DEBT_REGISTER.md](TECH_DEBT_REGISTER.md). The real publisher [#38148635625](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148635625) and cache probe [#38148744110](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38148744110) passed; neither strict job-level write isolation nor a cache TTL is asserted.
- [x] Final [PR-only Smoke #38151327577](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151327577) **SUCCESS**: 85 Node, 11 Python, both-theme Chromium, SVG XML, privacy/secret scan and rollback.
- [x] [Release PR #27](https://github.com/dturovskiy/deus-commit-chart/pull/27) merged after passing Smoke; `main=a98f79b3675257e87c71e1425ea450101347bf3b` and is synchronized.
- [x] Created and pushed **new annotated** `v1.5.2` at the verified release commit `a98f79b`. No existing tag or signed `v1` was moved.
- [x] [Post-tag manual consumer #38151449398](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38151449398) **SUCCESS** on the exact `@v1.5.2` source SHA: local/offline and live GraphQL modes, `LIVE_API_CANDIDATE_PASS`, all 365 days, 30/90/365 totals 282/845/3145.
- [x] Publish [stable GitHub Release v1.5.2](https://github.com/dturovskiy/deus-commit-chart/releases/tag/v1.5.2) as **Latest**, from the validated new tag.
- [ ] **Separately verify Marketplace publication option, listing and install snippet**. GitHub Releases Latest alone does not prove the Marketplace checkbox/button has been updated; see [release report](RELEASE_V1_5_2_REPORT.md).
- [ ] Verify Marketplace `Use latest version` snippet. If GitHub still serves the signed historical `@v1` alias, **do not describe it as v1.5.2**; an updated signed major tag requires a separately approved controlled tag migration/signing workflow. No destructive shortcut.
- [ ] Record final links/run IDs, post-release README wording, source/manifest SHA, checklist state and any outstanding accepted risks.

## Promotion blockers

As verified in [the final release report](RELEASE_V1_5_2_REPORT.md), the original remediation checklist is **65/65** and new `v1.5.2` source/tag/remote-tag consumer/Latest GitHub Release are published. **Marketplace listing/button UI confirmation is still outstanding** and tracked as TD-01; the signed legacy `@v1` alias remains unchanged. This is an archived preparation checklist, not evidence of an unperformed Marketplace publication step.
