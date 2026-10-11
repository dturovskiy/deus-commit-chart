# God Object / God Module audit — 2026-10-11

**Repository:** `dturovskiy/deus-commit-chart` at `main=b8fcf2c` (v1.5.2 code is on immutable tag `a98f79b`; later main commits since release update documentation only).

**Verdict:** **no production God Object class** and no confirmed runtime correctness defect. One **moderate God Module / responsibility concentration** in the renderer, and one **low-impact reverse layering dependency** via the CLI facade. These are **P2 maintainability risks**, not reasons to invalidate the stable release or reopen the 65-gate remediation. They are separately recorded as TD-14 and TD-15 in [the living debt register](TECH_DEBT_REGISTER.md).

## What was checked

Read all 12 production/QA JavaScript modules and the module dependency imports, including `generate-commit-chart.js`, `modern-renderer.js`, `build-activity-assets.js`, `contribution-snapshot.js`, `contribution-snapshot-model.js`, `chart-contract.js`, `verify-activity-assets.js`, `source-adapters.js`, `local-git-source.js`, `activity-metrics.js`, `ci/browser-smoke.js`, `ci/live-api-candidate.js`. Line counts below are current working-tree source lines, including blanks/comments, not a quality metric in isolation. Checked direct `require()` edges and boundaries between HTTP source, immutable domain snapshot, core math, renderer, CLI, production publisher and tests.

| Production component | Approx. LOC | Responsibilities and assessment |
|---|---:|---|
| `modern-renderer.js` | **504** | Theme and layout presets, pure range/geometry/ticks/smoothing, static SVG serialization, full interactive HTML/CSS template plus inlined client-side DOM/events. **Main God Module candidate** (not a God Object class). |
| `generate-commit-chart.js` | 257 | CLI argument parsing, series assembly and metadata, export-compatible functions, calls shared source/render modules. **Medium orchestration hub**, but public interface is intentional; no huge stateful class. |
| `contribution-snapshot.js` | 203 | GitHub GraphQL fetch/retry/errors, calendar coverage/boundary merge and deterministic snapshot identity. Cohesive GitHub-source/validation boundary; **not classified as a God Module** at this scale. |
| `build-activity-assets.js` | 147 | Bundle orchestration, checksum manifest and file writing; composes domain and renderer. **No God Object**; imports core operations from CLI (TD-15). |
| `contribution-snapshot-model.js` | 112 | Immutable validated snapshot contract. Focused. |
| `verify-activity-assets.js` | 85 | Independent artifact/manifest verification. Focused, but imports range-selection API via CLI (TD-15). |
| `chart-contract.js` | 61 | Validates 365-day series/metadata. Focused. |
| `local-git-source.js` | 66 | Bounded local Git source adapter. Focused. |
| `source-adapters.js` | 24 | Source routing boundary. Focused. |
| `activity-metrics.js` | 29 | Pure daily totals/trailing 7d averages. Focused. |

The `CDP` class in `ci/browser-smoke.js` is a small browser-test helper (~26 lines) rather than a production God Object. The longer browser smoke `main()` orchestrates tests in a dedicated QA script; it is not part of the user's Action runtime.

## TD-14 (P2) — renderer responsibility concentration

**Exact evidence:** `modern-renderer.js` lines 6–70 theme/layout constants; 95–234 range/geometry/date math; 235–296 `renderModernSvg`; 298–490 `renderModernHtml`; 306–385 HTML/CSS markup and 388–486 inlined browser script/DOM/UI events. `renderModernHtml` is ~193 lines (its embedded script about 99 lines). Both SVG and browser reuse the *same pure geometric functions*, so the previous duplicated mathematical implementations were remediated.

**Risk:** a single renderer change can affect styling, HTML template structure, DOM interaction, SVG string serialization and geometry together; review blast-radius and brittleness of inserting helper source via `Function.prototype.toString()` (existing TD-11) grow when adding themes, charts, build tooling or interaction features. Maintaining pure math, output formatters and client interaction in one file makes focused future refactoring harder.

**Current protection:** 30/90/365 golden hashes, exact HTML/SVG parity tests, XML/escaping constraints, theme contrast, actual Chromium desktop/390px both-theme interactions and standalone/offline Action tests. **No current correctness regression or performance incident observed.**

**Incremental remedy if triggered (not a rewrite now):**
1. Preserve the current public `modern-renderer.js` exports, Action inputs, CLI options and SVG/HTML output contracts.
2. Extract pure geometry and theme/layout constants into focused `chart-geometry.js` and `chart-theme.js` modules, with **compatibility re-exports**. Do not create arbitrary classes or stateful dependency injection just to shorten the file.
3. Extract static SVG serialization and the interactive HTML template/browser controller only when feature growth makes it beneficial; keep HTML self-contained/offline and SVG script-free.
4. Evaluate replacing `.toString()` inlining with a deterministic shared inline source or build step only if its reliability problem materializes. No new runtime dependency or extra scheduled CI.
5. Require passing full PR-only Smoke, SVG goldens (review intentional hash changes), 365-day numeric parity, real Chromium 30/90/365 both themes and release-tag consumer contract. **Never silently weaken golden tests merely because refactoring changes markup.**

**Revisit if:** renderer exceeds another substantial feature/layout change, a new interaction/theme is introduced, minification/transpilation is needed, a parity test fails, or routine changes repeatedly touch unrelated template/geometry portions.

## TD-15 (P2) — application layer imports the CLI

**Exact dependency:**
- `build-activity-assets.js:8` imports `buildSeries`, `selectRange`, `createMeta` from `generate-commit-chart.js` (entry-point CLI facade).
- `verify-activity-assets.js:8` imports `selectRange` from `generate-commit-chart.js`.
- `generate-commit-chart.js` also owns CLI `parseArgs`, `usage`, `main` and file output. It guards invocation behind `if (require.main === module)`, so **importing it does not currently execute the CLI**.

**Risk:** bundle generation and verification depend on an entrypoint module with CLI-level imports and concerns. A future CLI refactor may unintentionally affect library consumers or make cycle-free extraction harder. This is **architectural coupling**, not an actual circular dependency, security exposure or observed user-facing bug.

**Narrow remedy if triggered:** move `buildSeries` and `createMeta` to a pure `chart-series.js` (or similar) domain module; consume `selectRange` directly from `modern-renderer.js` (or its eventual pure range module) in bundle builder and verifier; preserve the old generator export names as compatibility aliases and test both single-file CLI and batch Action. Avoid changing data semantics, snapshot format or publication path.

**Revisit if:** a third entrypoint starts consuming the CLI as a library, the CLI gains side-effectful initialization, a dependency cycle occurs, or a refactor touches these exports.

## What does *not* justify a premature rewrite

- Line count alone: a ~200-line API adapter with focused cohesive policy is not a God Object.
- 7-day trend smoothing and complete snapshot validation are intentional, individually tested contracts.
- Publisher `contents: write`, GitHub-owned README cache and historical private-activity metadata are already separate accepted **operational/security** risks (TD-04, TD-05, TD-08), not God Objects.
- No need for a dependency injection framework, class hierarchy, bundler or additional continuous monitoring.
- **Release conclusion:** v1.5.2 and the Marketplace install button are verified; any future architecture cleanup is a separate backward-compatible PR, not a reason to force-update the signed legacy `v1` tag.
