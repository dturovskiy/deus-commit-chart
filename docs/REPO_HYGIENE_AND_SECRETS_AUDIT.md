# Repository hygiene, secrets and public-history audit — 2026-10-11

Scope: `dturovskiy/deus-commit-chart`. This is an evidence-based, **bounded** inspection of Git refs, published assets and known Actions artifacts; it does **not** certify that no unknown credential ever leaked to a log, cache, clone or external system.

## Tracked source and Git history

- Before cleanup: `main` had **54 tracked files**, totalling **298,170 uncompressed bytes**, with no committed `dist/`, `.env`, or generated activity SVG/HTML assets. `.gitignore` excludes these output paths. `main` history had 27 commits when audited.
- The working tree had only an unrelated untracked `.tmp-30.svg`; it must remain untouched.
- `activity-assets` had **6 tracked files**, **125,862 uncompressed bytes**, and **12 commits**. It retains snapshot history deliberately for forward-only rollback; do not force-push it or delete its historical snapshots as routine housekeeping.
- Before cleanup, **10 remote branches** corresponded to merged PRs #1–#7 and #9–#11. They were deleted individually after checking GitHub's merged-PR metadata, without touching their merged code or the protected publication refs. **`origin/tag-v1-check` was retained**, as its ownership/purpose was not verified from a merged PR.
- Git local object-store evidence before cleanup: `git count-objects -v` reported `size=2792` KiB loose objects plus `size-pack=14` KiB. Git garbage collection is neither required nor performed by this audit. Remote branch deletion need not immediately reduce physical pack size.

## Credential examination

A one-off read-only audit ran against **all locally fetched Git refs**, walking **268 unique reachable blobs**, about **3.4 MB uncompressed**. Every blob was within the 2 MiB scan cap; no oversized blobs were skipped. No matching credential patterns or historically added files with obvious credential extensions were found. Coverage included common GitHub PAT formats, AWS access keys, OpenAI/Slack/GitLab tokens, Google API keys, PEM private-key headers, and typical long credential assignment literals.

**Negative high-confidence scans are not a proof of universal secret absence.** Custom credential encodings, GitHub Actions logs, workflows in other repositories, deleted/unfetched refs, forks, caches, out-of-band disclosure and self-hosted execution are out of scope. No live GitHub token values were requested or printed. No token rotation is justified solely by a negative scan.

To reduce recurrence, `ci/check_secrets.py` now scans **tracked source files only** as a step in the **PR-only** Smoke workflow. It uses Python's standard library and denies listed credential formats, private-key filenames, and oversized unscanned tracked files; it prints only the **tracked-file ordinal and finding category**, never the actual secret or filename. Synthetic positive/negative tests cover detection and log redaction. It does **not** create scheduled runs or upload artifacts. GitHub Advanced Security/secret-scanning alerts were not available in this audit and are not claimed verified.

## Historical private activity in public assets

The *current* `activity-assets/index.html` has **no** serialized `restrictedContributionsCount`, `hasAnyRestrictedContributions`, or separate `totalCommitContributions` metadata. However, **4 early published commits** have these extra metadata fields in their historical `index.html`:

- `b53071014d40`
- `766cafd1228c`
- `042b73d540ce`
- `9a326c07f794`

These are **private-activity indicators, not access tokens**. The current privacy policy (`daily-aggregates-only-v1`) no longer exposes these fields. Public daily aggregates can still reflect token-visible private contributions by design; callers must understand the privacy trade-off.

Previous 90-day workflow artifacts still exist; checked examples from old releases measured **26–33 KB** per archive, with expiry dates in January 2027. New workflows upload no publishing artifacts. Artifact *metadata* was inspected, not all ZIP contents. Historical Git objects/archives, forks and image caches may still contain old outputs. Rewriting published Git history or deleting historical proof material is not authorized as part of routine cleanup and would not guarantee erasure from external copies. This requires a separate security/privacy decision.

## Recorded known-good production baseline

As checked at audit time on `origin/activity-assets`:

| Field | Value |
|---|---|
| Branch commit | `7054e215f6e33114326488c19035c9689bec8697` |
| Generator source commit | `deda84600fe39d74436fad9940a9f5f48c9cb742` |
| Publisher run | [38132248720](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38132248720) |
| Snapshot ID | `ead29838049707d688dbdcb5b3b822c8efba006601d13ddf8af5ee0b036a0ad9` |
| Generated (UTC) | `2026-10-11T10:31:29.624Z` |
| Data range | 2025-10-12 – 2026-10-11, 365 days |
| Contribution totals | 30d **222**, 90d **785**, 365d **3085** |

SHA-256 of its four data-bearing files in `manifest.json`:

| File | SHA-256 |
|---|---|
| `index.html` | `a883ae1fe25efe2d02031c3d27085865e88088edeef627d07101df352365f3f3` |
| `activity-30d.svg` | `782a8b55f616b7a0203ed650b7971a779d626c5cce68f64dfc61b795265fe176` |
| `activity-90d.svg` | `5b175e6dafa42517e88a752c0c43bf18480a5078c5817a522a4d36151aa04999` |
| `activity-365d.svg` | `a04cc0e228fb6bf624ed5dea1c01302dc9fcb6f99f0b58126d8f17871b3afa35` |

The subsequent [no-op publisher run 38132290387](https://github.com/dturovskiy/deus-commit-chart/actions/runs/38132290387) verified the same source/snapshot and left the `activity-assets` branch SHA unchanged. This baseline is point-in-time, **not a claim about future output or proxy cache**.

## Deliberately unchanged

- No Marketplace `v1` or `v1.4.1` tag moved.
- No `main` branch protection enabled.
- No existing `activity-assets` history rewritten or historical Actions artifacts deleted.
- No scheduled monitor or CI jobs reintroduced.
- No unrelated local file changed.
