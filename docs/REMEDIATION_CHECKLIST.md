# Deus Commit Chart — Remediation Checklist

> Status: **implementation in progress**. Checkboxes remain unchecked until individually verified.
> Plan and rationale: [ARCHITECTURE_REMEDIATION_PLAN.md](ARCHITECTURE_REMEDIATION_PLAN.md).
> Repository: `dturovskiy/deus-commit-chart`. No effort estimates or deadlines.
>
> **Rule for marking complete:** evidence (test output, review link, artifact SHA, CI run, or documented decision) must exist. "Implemented" without verification is **not done**.

## Gate 0 — Baseline and prerequisites

- [x] **DC-G0-01** Confirm branch, HEAD, remotes, and existing untracked files before implementation; do not touch unrelated `.tmp-30.svg`. (DEUS MCP git summary and status, 2026-10-10.)
- [ ] **DC-G0-02** Restore Node/npm execution in the DEUS MCP environment or select a reproducible alternate runner; record exact command, runtime and outcome.
- [ ] **DC-G0-03** Execute `npm test`, `npm run check`, and the relevant GitHub CI workflow; record failures without masking them.
- [ ] **DC-G0-04** Save reference manifest of existing 30d/90d/365d SVG and HTML, source SHA and latest known publish run.
- [ ] **DC-G0-05** Add a fixed-date fixture for 2026-10-09=7, 2026-10-10=3 and replacement 2026-10-10=15; assert last daily point and total delta +12.
- [ ] **DC-G0-06** Write down actual source/token visibility assumptions, expected freshness behavior and UTC/calendar-date semantics before editing ingestion logic.

**Gate 0 exit:** `npm test` can actually run, existing behavior is reproducible, and the regression case is executable.

## Gate 1 — Validated contribution snapshot

- [ ] **DC-G1-01** Introduce one versioned `ContributionSnapshot` schema with `schemaVersion`, `snapshotId`, `asOf`, source, calendar range and quality metadata.
- [ ] **DC-G1-02** Separate GitHub GraphQL and local Git source adapters; preserve local offline operation.
- [ ] **DC-G1-03** Fetch GitHub data **once** per publish job; freeze the validated snapshot and render all four artifacts from it.
- [ ] **DC-G1-04** Inject a fixed clock/`asOf` into date calculation; eliminate independently computed current dates within a build.
- [ ] **DC-G1-05** Validate exact expected calendar coverage, monotonic dates, uniqueness, valid ISO dates and nonnegative integer counts; fail on missing/invalid GraphQL data.
- [ ] **DC-G1-06** Preserve legitimate zero-activity days, but stop treating absent API dates as real zeros.
- [ ] **DC-G1-07** Test UTC midnight, calendar year boundary, DST transition, leap day and future timestamps; document date/timezone policy.
- [ ] **DC-G1-08** Distinguish GitHub `contributions` from local `commits`; retain any documented compatibility aliases.
- [ ] **DC-G1-09** Explicitly identify incomplete current-day data without reassigning GitHub's recorded calendar dates.
- [ ] **DC-G1-10** Create deterministic serialized fixture/snapshot and prove offline repeatability.
- [ ] **DC-G1-11** Review metadata exposed through public HTML/SVG, including restricted/private aggregate fields; no token/private repository names in output.

**Gate 1 exit:** one source snapshot, complete data validation, shared identity for HTML and 30/90/365 outputs.

## Gate 2 — Publication, integrity and failure handling

- [ ] **DC-G2-01** Add bounded GraphQL timeout; classify 401/403, 429, 5xx, network errors and malformed JSON distinctly.
- [ ] **DC-G2-02** Implement bounded retry/backoff for transient errors only; do not retry permanent authorization/schema failures.
- [ ] **DC-G2-03** Generate build manifest with snapshot ID, `generatedAt`, source SHA, run ID, source details, content hashes and totals for each range.
- [ ] **DC-G2-04** Cross-check published HTML/SVG totals and date ranges against the frozen snapshot before allowing publication.
- [ ] **DC-G2-05** Validate SVG XML, absence of scripts/remote resources, finite path coordinates and output file completeness.
- [ ] **DC-G2-06** Gate publication on validation; a failed fetch/render/validation must preserve previously published good artifacts.
- [ ] **DC-G2-07** Decide and implement guarded remote-ref publication; do not retain unconditional force-push without recovery protections.
- [ ] **DC-G2-08** Retain immutable build artifacts and previous manifest sufficient to restore an earlier verified release.
- [ ] **DC-G2-09** Rehearse rollback and verify restored content hashes in a nonproduction environment.
- [ ] **DC-G2-10** Scope `contents: write` and publishing credentials to the minimum necessary permissions; protect secrets from logs.
- [ ] **DC-G2-11** Add freshness health/failure reporting with an explicit configurable policy; separately document profile image-cache limitations.
- [ ] **DC-G2-12** Measure actual GitHub README embed lag and caching behavior; do not claim instantaneous invalidation without evidence.

**Gate 2 exit:** every publication is validated, traceable, recoverable and capable of flagging stale data.

## Gate 3 — Renderer and chart readability

- [ ] **DC-G3-01** Extract shared pure functions for range selection, daily totals, trailing 7-day average, geometry and tick generation.
- [ ] **DC-G3-02** Make static SVG and interactive HTML consume the same normalized snapshot and rendering mathematics.
- [ ] **DC-G3-03** Remove or quarantine legacy `renderHtml`/`renderSvg` only after proving old CLI and Action behavior remains supported.
- [ ] **DC-G3-04** Decide chart style: discrete daily bars/points + smooth 7d trend (recommended), or explicitly tested daily interpolation.
- [ ] **DC-G3-05** Verify flat sections, spikes, zero days and adjacent extrema without artificial overshoot/false intermediate values.
- [ ] **DC-G3-06** Label `Daily` vs `7d trend`, note incomplete current day, display data freshness in the static SVG.
- [ ] **DC-G3-07** Preserve script-free README SVG, self-contained HTML and instant 30/90/365 range switching.
- [ ] **DC-G3-08** Check legibility for 30/90/365 and narrow displays; validate accessible titles/descriptions and color contrast.

**Gate 3 exit:** chart is visually understandable without changing actual daily contribution data.

## Gate 4 — Tests and CI quality gates

- [ ] **DC-G4-01** Use a fixed injected clock for all time-dependent tests; repair the January 2026 fixture so its 30d assertion is meaningful.
- [ ] **DC-G4-02** Add data invariants and regression tests: 3→15, zero, missing day, duplicate date, invalid count, current-day partial and cumulative delta.
- [ ] **DC-G4-03** Add GraphQL fixtures: success, partial calendar, auth failure, rate limit, transient server error, timeout and visibility differences.
- [ ] **DC-G4-04** Assert exactly **one** GitHub API collection per build and one `snapshotId` across all formats.
- [ ] **DC-G4-05** Assert exact totals, date ranges, trend values and output metadata for each selected 30/90/365 window.
- [ ] **DC-G4-06** Add SVG golden tests plus XML/path checks; static SVG must not contain executable script or network dependencies.
- [ ] **DC-G4-07** Add HTML/browser-level test of range controls, tooltip values, current-day state and responsive rendering.
- [ ] **DC-G4-08** Verify static-vs-interactive numerical parity for the same snapshot.
- [ ] **DC-G4-09** Add end-to-end negative publish test: one failed stage leaves the production ref/artifacts unchanged.
- [ ] **DC-G4-10** Require numerical/integrity CI checks before publication; never rely solely on grep/file-existence smoke assertions.
- [ ] **DC-G4-11** Confirm local mode continues producing correct results without GitHub credentials or network access.

**Gate 4 exit:** passing checks provide evidence of numerical accuracy, source integrity, display parity and safe failure behavior.

## Gate 5 — Release and handoff

- [ ] **DC-G5-01** Record design decisions on freshness SLA, visibility, time-zone semantics, chart style and publication strategy in the plan or an ADR.
- [ ] **DC-G5-02** Verify one candidate build against a known API response captured with the intended token at the same observation time.
- [ ] **DC-G5-03** Verify the published HTML + three SVGs all match the candidate manifest and snapshot ID.
- [ ] **DC-G5-04** Inspect actual README image after publish; record any remaining GitHub caching lag.
- [ ] **DC-G5-05** Review Action permissions, error handling, public-output privacy and compatibility.
- [ ] **DC-G5-06** Update README/CLI/Action docs, troubleshooting runbook and release notes.
- [ ] **DC-G5-07** Save the tested rollback command/process and prove it restores a known-good manifest.
- [ ] **DC-G5-08** Close finding IDs **DC-01–DC-15** only with linked evidence, explicit mitigation or accepted risk.

**Gate 5 exit:** maintainable, verifiable release that cannot silently publish known-invalid data.

## Final acceptance contract

- [ ] All output formats use **one** validated snapshot for each build.
- [ ] Missing API data never masquerades as zero activity.
- [ ] A new daily reading can legitimately update 3→15; historical snapshot is not rewritten or misrepresented.
- [ ] Every published artifact exposes or references traceable freshness/snapshot identity.
- [ ] Correct values are independently verified, not inferred from a pretty curve or green CI badge.
- [ ] Errors cannot overwrite the last verified release; rollback has been rehearsed.
- [ ] README SVG remains valid without JS; HTML is self-contained; local Git mode is offline.
- [ ] Security/privacy boundary and source-visibility assumptions are documented.
- [ ] All completion checkmarks have actual evidence links or attached test logs.

## Evidence log (fill as work progresses)

| Date / change | Finding or gate | Test / run / SHA / link | Result / notes |
| --- | --- | --- | --- |
| 2026-10-10 baseline | DC-01, DC-02, DC-07 | `activity-assets/index.html`, `publish-pages.yml`, `smoke.yml` | Static analysis + observed snapshot; no fixes applied |
| 2026-10-10 baseline | Gate 0 prerequisite | DEUS MCP `run_task_recipe_async` | Blocked: `package_manager_binary_missing`; tests **not executed** |
| 2026-10-10 implementation | DC-01/03/05/06/08/09/13 | `contribution-snapshot.js`, `build-activity-assets.js`, `verify-activity-assets.js`, workflows, renderer | Implemented locally; Node syntax via isolated JS parser and mock fixture checks passed; full Node CI pending. |
| — | — | — | — |

## Working conventions

1. Mark items as complete only after implementation **and** verification.
2. Maintain the plan's findings register when new issues are discovered.
3. Keep all generated/test artifacts and source changes bounded to the `deus-commit-chart` repository.
4. Do not commit/push/deploy automatically as a side effect of checking boxes; those are separate, reviewable actions.
5. Preserve unrelated working-tree changes and untracked files.
