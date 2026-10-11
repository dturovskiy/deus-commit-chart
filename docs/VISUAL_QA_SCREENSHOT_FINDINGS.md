# Actual GitHub UI screenshots — visual QA observation 2026-10-11

> **Evidence source:** two screenshot images provided directly in the 2026-10-11 project conversation (not copied into the public repository, because the desktop screenshot contains unrelated browser tabs/windows). This is a **direct visual observation of supplied screenshots**, not a complete manual review of every theme, range or browser. The screenshots do not independently verify count parity with the GraphQL API.
>
> **Updated verdict (2026-10-11): accepted zoom-to-read limitation after a third user-supplied screenshot**. Original unzoomed mobile metadata is small, but the follow-up zoomed iPhone view shows title, range dates, statistics, axis and bars readable when enlarged. The user explicitly stated zooming is available and the miniature text is not a problem. No data corruption, chart clipping or missing columns were visible in the original 30-day screenshots. Human coverage remains 30-day dark embed only; other modes have Chromium test evidence.

## Observed surfaces

| Screenshot | What the image actually shows | Pass/finding |
|---|---|---|
| Desktop Chrome, GitHub Marketplace `Deus Commit Chart` listing (`github.com/marketplace/actions/deus-commit-chart`) | GitHub Action card, live 30-day dark-theme README-safe SVG, daily green bars, blue 7-day trend, axis/date labels, release badge `v1.5.1 (Latest)`, `Use latest version` button | **Pass**: chart area fully visible with no obvious clipped bars/axes or legend. **Not tested by screenshot**: clicking button, dropdown code, light-theme output, interactive HTML, 90/365 periods |
| Mobile browser, GitHub profile `dturovskiy`, `Activity` section (provided image size 591×1280 pixels) | Dark GitHub profile, embedded 30-day SVG and separate `30d`/`90d`/`365d` links underneath. The 30-day bars and blue trend are visible, no obvious horizontal overflow or graph clipping | **Partial pass**: chart content and links render. **Visual defect:** the static SVG's date/metadata/update text, grid numerals and top legend are reduced to very small glyphs and are difficult to read without opening/zooming the chart. Screenshot cannot establish the light theme or HTML modes |

The profile chart is a static `<img>`, not the full interactive HTML viewport; therefore the 390px HTML scroll policy tested by Chromium does **not** by itself solve GitHub README image scaling. Do not represent the three links under the SVG as functioning in-image controls or assert navigation without a click test.

## Root cause and suggested fix scope

- The produced README SVG uses a **1120-wide viewBox** (spacious preset), with source typography typically **12 units for metadata and dates** and a **20-unit title**. When the entire image is downscaled to approximately 460–470 displayed screenshot pixels, the metadata/dates become roughly **5 CSS/screenshot pixels**, and the title roughly **8 px**. These are indicative scale calculations, not device-calibrated accessibility measurements; the physical iPhone/browser zoom level is not recorded.
- This is a **rendering/legibility issue**, not a contribution-data discrepancy. The original source snapshot validates all 365 daily counts across HTML/SVG/manifest.
- **Decision:** do **not** redesign or change the SVG before this release. The user's enlarged iPhone screenshot demonstrates that metadata/date/axis text becomes readable with zoom, and the user expressly accepts that usage. The unzoomed miniature remains intentionally compact. A future enhancement can consider a profile-specific narrower layout or readable summary **if** user feedback demands it; this would require review of six SHA-256 SVG goldens, totals and new mobile screenshots. Keep this limitation visible in TD-12, not as a fabricated absence of a defect.
- The screenshot also confirms **Marketplace `v1.5.1` is still Latest** as observed. The separate `v1.5.2` draft is intentionally not published; a Marketplace button selection/version update remains TD-01.

## Coverage still required for DC-G3-08

- The supplied desktop image is Marketplace **dark 30d**, not a generated standalone HTML report with range switching.
- The supplied phone image is GitHub profile **dark 30d**, not a 90d/365d or light-theme screenshot.
- Real Chromium CI independently tests 30/90/365 in both themes at desktop/390px and keyboard/tooltip interactions; tests passing do not waive observed tiny mobile SVG metadata.
- The follow-up user screenshot shows zoomed text readability; the user accepts zoom-to-read instead of a typography change. The [visual acceptance matrix](VISUAL_QA_MATRIX.md) now uses an **explicitly scoped** review: genuine 30d dark mobile/desktop screenshot observations plus real automated 30/90/365 light/dark coverage. Remaining direct Safari/Firefox/mobile-app visual review is deferred to TD-12, not reported as performed.

## Privacy and release boundary

Original screenshots are retained only in the chat context, not committed to GitHub (they include unrelated browser UI). No new tag, Marketplace listing update, `v1` movement, scheduled job or historical privacy cleanup is authorized by these screenshots.
