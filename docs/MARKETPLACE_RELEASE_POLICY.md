# Marketplace Release Policy

> Audit: 2026-10-11. This policy does **not** change the currently published Marketplace tag or require branch protection.

## Actual installed version vs source tree

- The **signed annotated** `v1` major tag resolves to commit `eddf908ead0a83361f4a4e2930405ce30fd3d086` (2026-09-01), the `v1.4.1` release generation. GitHub's latest public release was `v1.4.1` when audited.
- The current `main` is newer; corrections to calendar coverage, data integrity/privacy, chart rendering, local Git and CI are **not** installed by workflows that use `uses: dturovskiy/deus-commit-chart@v1` yet.
- Do **not** confuse a green `main` test suite or freshly published `activity-assets` graph with a Marketplace release. Neither operation changes the signed `v1` tag.
- The previous `v1` implementation generated HTML and each requested SVG through separate source reads; the newer generator uses one validated snapshot and includes explicit integrity/privacy checks. The public composite Action's 15 input names and 2 output names remain unchanged, as verified against `v1:action.yml`. The new composite Action no longer needs `npm ci` because `package.json` has no runtime dependencies.

## Proposed next release (requires explicit maintainer approval)

1. Review and merge changes through an ordinary PR; run **PR-only Smoke** with composite Action, local Git offline fixture, real browser-simulation parity and 30/90/365 SVG verifiers. Confirm the upstream Action pins.
2. Capture the intended `main` commit SHA. Test from a clean checkout and use a dedicated release tag (proposed `v1.5.0`) rather than advertising untagged `@main`. Make the new versioned tag and GitHub Release only after the maintainer approves the contents and release notes.
3. Document user-facing changes: frozen 365-day snapshot, output-manifest schema/privacy policy, UTC local-Git day interpretation, strict failure behavior and changed file-generation implementation. Note that using token-visible private aggregate contributions may disclose timing even without private repository metadata.
4. Verify the actual `@v1.5.0` consumer Action in a separate example workflow/repository after tagging. The `v1` floating major alias should advance **only after this test and explicit approval**.
5. Preserve the existing signed `v1` tag object/signature until an authorized, correctly signed update is arranged. Moving a signed tag is a compatibility/security-sensitive operation; do not automatically `git push --force` an existing tag or silently mutate versions used by other repositories.

## Compatibility guarantees

| Contract | Audited state |
|---|---|
| Composite Action inputs | `source`, `username`, `token`, `repo`, `branch`, `author`, `default-days`, `ranges`, `theme`, `layout`, `width`, `height`, `hide-border`, `output-dir`, `title` |
| Composite Action outputs | `output-dir`, `index-html` |
| Supported chart ranges | `30`, `90`, `365` |
| Formats | self-contained HTML and script-free SVG |
| Publication | always performed **by the caller**; using the Marketplace Action does not edit remote repositories or start background schedules |
| Runtime | Node.js 22 installed by a SHA-pinned `setup-node`; no package install needed in the new implementation |
| Changes requiring explicit release notes | local Git UTC bucketing, strict calendar/data validation, new metadata manifest/public aggregate policy |

## Risks not addressed by this policy

- The signed old `@v1` release continues to contain its historical implementation until its major alias is explicitly advanced. No tag was moved by this audit.
- Major-v4 upstream `actions/checkout` and `actions/setup-node` execute an older Node Actions runtime; test and update to a newer major when GitHub announces retirement, rather than silently chasing mutable version tags.
- Main branch protection is explicitly **deferred**; do not enable it as part of this change.
