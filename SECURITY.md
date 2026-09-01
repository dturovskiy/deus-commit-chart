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

## Security boundaries

Static SVG output must remain script-free and self-contained. The reusable GitHub Action generates files only; publishing or force-pushing generated assets is deliberately left to the caller workflow so repository mutation remains explicit.
