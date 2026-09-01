# End User License Agreement

Effective date: 2026-09-01

This End User License Agreement ("EULA") applies to your use of Deus Commit Chart when obtained or used through GitHub Marketplace, GitHub Actions, or the project's repository.

## 1. Acceptance

By installing, invoking, or otherwise using Deus Commit Chart, you agree to this EULA. If you do not agree, do not use the product.

## 2. Open-source license

The Deus Commit Chart source code is provided under the MIT License included in `LICENSE`. Your rights to copy, use, modify, merge, publish, distribute, sublicense, and sell copies of the MIT-licensed source code are governed by that license.

This EULA supplements the MIT License for use of the distributed Developer Product and does not reduce rights already granted under the MIT License. If this EULA conflicts with the MIT License regarding rights in the MIT-licensed source code, the MIT License controls for those source-code rights.

## 3. Product scope

Deus Commit Chart generates contribution/activity charts from either local Git metadata or data returned by GitHub's APIs. The GitHub Action runs in the caller's GitHub Actions environment and generates files in locations selected by the caller workflow.

The project does not provide a hosted backend as part of the current product.

## 4. Credentials and account permissions

You are responsible for:

- providing any GitHub token or other credential required for your chosen configuration;
- granting only the permissions necessary for that configuration;
- keeping credentials secure and complying with GitHub's terms and security requirements;
- reviewing workflow permissions before publishing or modifying repository content.

Deus Commit Chart is designed not to write GitHub tokens into generated HTML or SVG output. You must not intentionally configure workflows in a way that exposes credentials in logs, generated assets, or public repositories.

## 5. Generated output and publishing

You control where generated charts and reports are stored or published. You are responsible for reviewing generated output before making it public and for ensuring that your use and publication of the output comply with applicable law, GitHub policies, repository policies, and any obligations applicable to your organization.

The tool may include aggregate contribution counts and metadata returned by GitHub. It does not intentionally include private repository names, private commit messages, or repository source code in GitHub contribution charts.

## 6. Third-party services

GitHub, GitHub Actions, the GitHub API, and any other third-party service you choose to use with Deus Commit Chart are provided under their own terms, policies, availability commitments, and limits. The project maintainer does not control those services and is not responsible for changes, outages, rate limits, account restrictions, or data handling by those providers.

## 7. Privacy

The project's current data-handling practices are described in `PRIVACY.md`. Normal use does not send telemetry or user data to maintainer-operated infrastructure because the project currently operates no such backend.

## 8. Support and maintenance

Support is provided on a reasonable-effort basis through the repository's documented support channels. Bug reports and feature requests should use the repository issue templates. Security-sensitive matters should follow `SECURITY.md` and should not be posted publicly.

No specific response time, uptime, maintenance period, or service-level agreement is promised unless separately agreed in writing.

## 9. Prohibited use

You may not use Deus Commit Chart in a manner that violates applicable law, GitHub's terms or acceptable-use policies, or the rights of third parties. You may not use the product to intentionally expose credentials, access data without authorization, deliver malware, or circumvent GitHub security or API restrictions.

## 10. Disclaimer of warranties

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DEUS COMMIT CHART IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

The project does not warrant that generated data will always be complete, current, error-free, or continuously available. GitHub determines what contribution data its APIs return to a particular authenticated viewer.

## 11. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE AUTHORS, COPYRIGHT HOLDERS, AND PROJECT MAINTAINERS WILL NOT BE LIABLE FOR ANY CLAIM, DAMAGES, DATA LOSS, LOST PROFITS, BUSINESS INTERRUPTION, OR OTHER LIABILITY ARISING FROM OR RELATED TO THE SOFTWARE OR ITS USE, WHETHER IN CONTRACT, TORT, OR OTHERWISE.

Nothing in this EULA excludes or limits liability that cannot lawfully be excluded or limited.

## 12. Termination

Your rights under this EULA terminate if you materially breach this EULA and fail to cure the breach where cure is legally required. Termination of this EULA does not revoke rights that cannot be revoked under the MIT License for copies already received under that license.

## 13. Changes

Future versions of Deus Commit Chart may be distributed with updated terms. Changes to this EULA do not retroactively remove rights already granted to you under the MIT License for versions you previously received.

## 14. Contact

For general support, use the repository's documented issue and support channels. For security-sensitive matters, follow `SECURITY.md`. Do not submit secrets or private repository information in public issues.
