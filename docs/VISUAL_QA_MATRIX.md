# Visual acceptance matrix — GitHub contributions charts

> Review protocol updated 2026-10-11. **Status: partial real-screen observations; final human sign-off pending.** [Two user-supplied screenshots were visually examined](VISUAL_QA_SCREENSHOT_FINDINGS.md): desktop Marketplace dark 30d renders without clipping, while the iPhone GitHub-profile dark 30d renders its bars/trend but the embedded static SVG's metadata, dates and legend are difficult to read at mobile scale. Automated passing geometry/contrast tests are *evidence*, not a claim that every glyph, theme, browser or GitHub profile image has been visually inspected.

## Prerequisite evidence

- Real Chromium smoke runs in the **existing PR-only CI job**, with zero remote asset requests: desktop 30/90/365 range switches, real hover tooltip, keyboard Enter, 390px horizontal scroll, and accessibility metadata. Both `github-compact` and `github-light` HTML outputs are validated by the extended Smoke suite, each with desktop/mobile 30/90/365 interactions.
- `test/calendar-contract-mobile.test.js` checks WCAG AA contrast of text, muted text, bars and trend in both themes; `test/svg-golden.test.js` pins deterministic SVG content hashes for distinct datasets/themes.
- Manual comparison must use matching observation time and account visibility. Native GitHub squares display `contributionCount` (not all raw Git commits), while standalone SVG and HTML render the same checked 365-day source.

## Human review sheet — complete before checking DC-G3-08

| Surface / theme | 30 days | 90 days | 365 days | Explicit review |
|---|---|---|---|---|
| HTML, github-compact, desktop 1280px | [ ] | [ ] | [ ] | readable axis/dates, label contrast, bars and trend |
| HTML, github-light, desktop 1280px | [ ] | [ ] | [ ] | same, incl. sparse days/peaks |
| HTML, github-compact, mobile 390px | [ ] | [ ] | [ ] | horizontally scrollable, latest days visible, no clipped buttons |
| HTML, github-light, mobile 390px | [ ] | [ ] | [ ] | same, keyboard/touch hint and focus |
| Static README SVG, each theme at native size | [ ] | [ ] | [ ] | correct legend/current-day note/accessible title |
| GitHub profile README embedded static 30d SVG | [ ] | n/a | n/a | real mobile screenshot reviewed; bars/trend visible, but **tiny metadata and dates** block readability pass; see [findings](VISUAL_QA_SCREENSHOT_FINDINGS.md) |

A successful check must record: *reviewer*, *review date*, *browser + device/viewport*, *exact source asset snapshot/version*, *observed readability / defects*, *CI run URL*. For the true GitHub profile embedded image, include the actual profile URL and the observed snapshot prefix; do not assume that a raw URL proves an independent proxy refreshed.

## Pass / fail criteria

1. Exact per-day bars remain visible and distinguishable at 30/90/365, including zero days and the current incomplete day. The smooth line is clearly labelled `7d trend`, not mistaken for daily contributions.
2. Labels, 30/90/365 buttons, hover tooltip, active range, scroll hint and focus outline do not overlap/crop or lose contrast in tested viewports.
3. A11y chart title/description, legend, static SVG (without script), and keyboard interaction remain usable; no external browser HTTP requests.
4. Any confirmed issue is logged and fixed in a PR with before/after evidence, Chromium CI and an explicit new inspection. Passing CI alone does not check these human review boxes.

**Acceptance:** DC-G3-08 may be marked `[x]` only after the manual review sheet is completed and supported with evidence. The unfinished parts do not imply defective chart data; existing GraphQL/manifest tests already validate all 365 daily counts.
