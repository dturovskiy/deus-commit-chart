# Security Policy

## Supported versions

Security and privacy fixes are applied to the latest supported released Action, **v1.5.3**. The historical signed major tag `v1` currently resolves to **v1.4.1** and does **not** automatically include these fixes. Prefer `dturovskiy/deus-commit-chart@v1.5.3` or its verified immutable commit SHA. Changes on the default branch do not alter the immutable released `v1.5.3` Action.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose credentials, private contribution data, repository contents, or unsafe GitHub Actions behavior.

Prefer GitHub's private vulnerability reporting / security advisory flow for this repository when available. Include:

- affected version or commit;
- reproduction steps;
- expected and observed behavior;
- impact assessment;
- any suggested mitigation, if known.

The project never intentionally writes GitHub tokens into generated HTML or SVG output. GitHub tokens are accepted through environment variables or Action secrets and are used only while fetching contribution data.

PR-only Smoke CI runs the standard-library `ci/check_secrets.py` check against tracked source files. It fails on high-confidence credential patterns or credential-like filenames, without printing token contents. The maintainer separately performs bounded historical audits. **A passing scan cannot guarantee the absence of secrets** in old/unreachable Git history, workflow logs, expired artifacts, forks, caches or unknown token formats. Report credible exposures privately using the instructions above; revoke/rotate actual compromised credentials rather than merely deleting a file from `main`.

## Security boundaries

Static SVG output must remain script-free and self-contained. The reusable GitHub Action generates files only; the caller's publishing workflow validates artifacts and creates a fast-forward commit to the `activity-assets` branch, never a force push. Public GitHub-mode reports may contain aggregate daily counts that reflect authorized private contributions, but must not include tokens, source repository identities, private contribution breakdown fields, or raw GraphQL response objects. The independent publication verifier enforces the allowed metadata contract.
