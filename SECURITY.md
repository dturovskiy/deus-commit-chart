# Security Policy

## Supported versions

Security fixes are targeted at the current `v1` line and the latest release.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose credentials, private contribution data, repository contents, or unsafe GitHub Actions behavior.

Prefer GitHub's private vulnerability reporting / security advisory flow for this repository when available. Include:

- affected version or commit;
- reproduction steps;
- expected and observed behavior;
- impact assessment;
- any suggested mitigation, if known.

The project never intentionally writes GitHub tokens into generated HTML or SVG output. GitHub tokens are accepted through environment variables or Action secrets and are used only while fetching contribution data.

PR-only Smoke CI runs the standard-library `ci/check_secrets.py` check against tracked source files. It fails on high-confidence credential patterns or credential-like filenames, without printing token contents. This check does not cover older Git history, GitHub logs/artifacts, external forks or unknown token formats; see [Repository Hygiene and Secrets Audit](docs/REPO_HYGIENE_AND_SECRETS_AUDIT.md).

## Security boundaries

Static SVG output must remain script-free and self-contained. The reusable GitHub Action generates files only; the caller's publishing workflow validates artifacts and creates a fast-forward commit to the `activity-assets` branch, never a force push. Public GitHub-mode reports may contain aggregate daily counts that reflect authorized private contributions, but must not include tokens, source repository identities, private contribution breakdown fields, or raw GraphQL response objects. The independent publication verifier enforces the allowed metadata contract.
