# Contributing to Deus Commit Chart

Thanks for considering a contribution.

## Development setup

Requirements:

- Node.js 18 or newer;
- Git;
- npm.

Install and validate:

```bash
npm ci
npm test
npm run check
```

The project intentionally has no runtime charting-library dependency. Please avoid adding dependencies unless they materially simplify maintenance, correctness, or security.

## What to test

Changes to contribution data handling should preserve zero-activity calendar days and the distinction between local Git commits and GitHub contribution-calendar activity.

Changes to SVG rendering should keep output self-contained, script-free, and safe for GitHub README embedding. Avoid external fonts, stylesheets, images, or JavaScript in static SVG output.

Changes to the interactive report should keep 30d / 90d / 365d switching client-side after generation; switching ranges should not require a new GitHub API request.

## Pull requests

Keep changes focused and explain the user-facing reason for the change. Include or update tests when behavior changes. Before opening a pull request, run:

```bash
npm test
npm run check
```

If the change affects generated visuals, include a short description of the expected rendering difference.

## Issues

Use the repository issue templates for bugs and feature requests. For security-sensitive reports, follow `SECURITY.md` instead of opening a public issue.
