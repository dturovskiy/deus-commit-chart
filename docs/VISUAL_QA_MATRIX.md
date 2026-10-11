# Visual acceptance matrix — GitHub contributions charts

> Review protocol updated 2026-10-11. **Status: accepted, with explicitly limited real-device scope.** The user's desktop Marketplace and iPhone GitHub-profile screenshots show 30d bars/trend without clipping. The third user-provided **zoomed iPhone screenshot at 17:17** makes the title, date, axis and chart values readable; the user expressly accepted zoom-to-read mobile metadata as nonblocking. Automated real Chromium CI covers all 30/90/365 ranges in both themes on desktop/390px; this is **not** a claim of human inspection of every theme, browser and range. See [review evidence](VISUAL_QA_SCREENSHOT_FINDINGS.md), and keep wider-device coverage in TD-12.

## Prerequisite evidence

- Real Chromium smoke runs in the **existing PR-only CI job**, with zero remote asset requests: desktop 30/90/365 range switches, real hover tooltip, keyboard Enter, 390px horizontal scroll, and accessibility metadata. Both `github-compact` and `github-light` HTML outputs are validated by the extended Smoke suite, each with desktop/mobile 30/90/365 interactions.
- `test/calendar-contract-mobile.test.js` checks WCAG AA contrast of text, muted text, bars and trend in both themes; `test/svg-golden.test.js` pins deterministic SVG content hashes for distinct datasets/themes.
- Manual comparison must use matching observation time and account visibility. Native GitHub squares display `contributionCount` (not all raw Git commits), while standalone SVG and HTML render the same checked 365-day source.

## Scoped release visual review (manual evidence versus automated coverage)

| Surface / theme | 30 days | 90 days | 365 days | Explicit review |
|---|---|---|---|---|
| HTML, github-compact, desktop 1280px | [ ] | [ ] | [ ] | readable axis/dates, label contrast, bars and trend |
| HTML, github-light, desktop 1280px | [ ] | [ ] | [ ] | same, incl. sparse days/peaks |
| HTML, github-compact, mobile 390px | [ ] | [ ] | [ ] | horizontally scrollable, latest days visible, no clipped buttons |
| HTML, github-light, mobile 390px | [ ] | [ ] | [ ] | same, keyboard/touch hint and focus |
| Static README SVG, each theme at native size | [ ] | [ ] | [ ] | correct legend/current-day note/accessible title |
| GitHub profile README embedded static 30d SVG | [x] | n/a | n/a | user-provided normal + zoomed iPhone screenshots: intact graph; metadata legible on zoom, owner accepts zoom-to-read as a supported compact embed; see [findings](VISUAL_QA_SCREENSHOT_FINDINGS.md) |

A successful check must record: *reviewer*, *review date*, *browser + device/viewport*, *exact source asset snapshot/version*, *observed readability / defects*, *CI run URL*. For the true GitHub profile embedded image, include the actual profile URL and the observed snapshot prefix; do not assume that a raw URL proves an independent proxy refreshed.

## Pass / fail criteria

1. Exact per-day bars remain visible and distinguishable at 30/90/365, including zero days and the current incomplete day. The smooth line is clearly labelled `7d trend`, not mistaken for daily contributions.
2. Labels, 30/90/365 buttons, hover tooltip, active range, scroll hint and focus outline do not overlap/crop or lose contrast in tested viewports.
3. A11y chart title/description, legend, static SVG (without script), and keyboard interaction remain usable; no external browser HTTP requests.
4. Any confirmed issue is logged and fixed in a PR with before/after evidence, Chromium CI and an explicit new inspection. Passing CI alone does not check these human review boxes.

**Revised release acceptance, 2026-10-11:** DC-G3-08 is accepted using the real desktop/mobile 30d embed screenshot review, additional enlarged iPhone screenshot, the user's explicit agreement that zoom-to-read is acceptable for tiny metadata, and successful Chromium **both-theme 30/90/365 desktop/mobile** behavior plus contrast/accessible SVG checks. Unchecked boxes above mean **no direct human screenshot was supplied** for those configurations; automation is their evidence, not fabricated human inspection. Retain TD-12 for cross-browser/device visual coverage and re-open on a legibility complaint. The snapshot/GraphQL tests independently prove all 365 daily counts.
