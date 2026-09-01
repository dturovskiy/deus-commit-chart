# Privacy Notice

Effective date: 2026-09-01

This Privacy Notice describes how Deus Commit Chart handles data when used as a local command-line tool or as a GitHub Action.

## Responsible party

Deus Commit Chart is maintained by Denys Turovskiy (`@dturovskiy` on GitHub). For normal tool execution, the maintainer does not receive the data processed in the user's local environment or GitHub Actions runner. If information is voluntarily provided through support or security channels, the maintainer is responsible for handling that information consistently with this notice.

## Summary

Deus Commit Chart does not operate a developer-controlled backend, analytics service, telemetry endpoint, or user database. The project does not intentionally collect or retain GitHub tokens, repository contents, contribution data, or generated charts on infrastructure operated by the project maintainer.

When you run the GitHub Action, processing occurs in the GitHub Actions runner for your workflow. When you use the local CLI, processing occurs on the machine where you run the tool.

## Data processed by the tool

### GitHub contribution source

When `source: github` or `--source github` is used, the tool may process:

- the GitHub username requested by the workflow or CLI;
- daily aggregate contribution counts returned by GitHub's GraphQL API;
- contribution-calendar date ranges;
- aggregate metadata such as active-day totals, total commit contributions, `restrictedContributionsCount`, and `hasAnyRestrictedContributions` when GitHub returns those fields;
- a GitHub token supplied by the user or caller workflow solely to authenticate the GitHub API request.

The generated chart does not include private repository names, private commit messages, source code, issue contents, pull-request contents, or other private repository details. Restricted/private contribution activity, when GitHub exposes it to the authenticated viewer, is represented only through aggregate counts.

### Local Git source

When `source: local` or the default local CLI mode is used, the tool reads Git metadata needed to build the selected activity series, including commit dates and optional branch/author filters. Local-source generation does not require a network request.

## GitHub tokens and credentials

Tokens are accepted through environment variables or GitHub Action secrets. Deus Commit Chart does not intentionally write tokens to generated HTML or SVG files and does not transmit them anywhere except to GitHub as part of the authenticated GitHub API request required for `source: github`.

Users are responsible for supplying tokens with the minimum permissions appropriate for their use case and for protecting those credentials in accordance with GitHub's security guidance.

## Storage and retention

Deus Commit Chart itself does not provide remote storage and does not retain user data on maintainer-operated infrastructure.

Generated HTML and SVG files are written to locations chosen by the user or caller workflow. If a user publishes those files to a Git branch, GitHub Pages, an artifact store, a public profile README, or another service, the retention and visibility of those files are controlled by that user and the relevant hosting provider.

Workflow logs, caches, artifacts, repository data, API requests, and other information processed by GitHub infrastructure are subject to GitHub's own terms and privacy practices.

## Telemetry and advertising

The project does not include first-party analytics, advertising trackers, behavioral profiling, or telemetry reporting to the project maintainer.

## Data sharing

The project maintainer does not sell user data and does not intentionally receive data from normal executions of the tool. For GitHub-backed generation, data is exchanged directly between the user's execution environment and GitHub's API.

## User choices

You can avoid GitHub API processing entirely by using the local Git source. You can stop future processing by removing the Action from your workflow or by no longer running the CLI.

If you publish generated assets, remove those assets from the location where you published them if you no longer want them to be publicly available.

## Security reports and privacy questions

Do not place credentials, private repository data, or other sensitive information in a public issue. For security-sensitive matters, follow the private reporting guidance in `SECURITY.md`. General privacy questions that do not contain sensitive information may be raised through the repository's normal support channels.

## Changes to this notice

If the project later adds maintainer-operated hosting, telemetry, analytics, account storage, or other processing that materially changes these practices, this notice should be updated before that functionality is offered to users.
