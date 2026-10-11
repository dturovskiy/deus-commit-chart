#!/usr/bin/env python3
"""Read-only high-confidence credential guard for tracked files in PR CI.

No third-party packages; matches are never printed. This checks tracked source,
not older Git history, GitHub artifacts, external forks or Actions logs.
"""
from __future__ import annotations

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAX_FILE_BYTES = 2 * 1024 * 1024

# High-confidence credential formats; intentionally avoid broad, noisy "secret"
# string matching that would flag GitHub Actions expressions or unit fixtures.
CREDENTIAL_PATTERNS = {
    "github_token": re.compile(rb"\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{20,}"),
    "github_fine_grained_pat": re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{16,}"),
    "aws_access_key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "private_key_pem": re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    "gitlab_pat": re.compile(rb"\bglpat-[A-Za-z0-9_-]{18,}"),
    "slack_token": re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{18,}"),
    "openai_api_key": re.compile(rb"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{28,}"),
    "google_api_key": re.compile(rb"\bAIza[0-9A-Za-z_-]{35}"),
}
ASSIGNMENT = re.compile(
    rb"""(?ix)\b(?:token|api[_-]?key|client[_-]?secret|password|
                 passwd|secret[_-]?key)\s*[=:]\s*['"]([a-z0-9_+\/=-]{28,})['"]"""
)
PRIVATE_NAMES = re.compile(
    r"(?i)(?:^|/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|"
    r"[^/]+\.(?:pem|p12|pfx|key)|credentials\.json)$"
)


def check_bytes(contents: bytes) -> list[str]:
    """Return categories only. Do not expose matches, even on failure."""
    problems = [kind for kind, rx in CREDENTIAL_PATTERNS.items() if rx.search(contents)]
    if ASSIGNMENT.search(contents):
        problems.append("long_literal_credential_assignment")
    return problems


def audit_entries(entries: list[tuple[str, bytes]]) -> list[tuple[int, str]]:
    """Return tracked-file ordinals + reason; never expose secret-containing paths."""
    findings = []
    for number, (path, contents) in enumerate(entries, 1):
        if PRIVATE_NAMES.search(path):
            findings.append((number, "sensitive_filename"))
        if len(contents) > MAX_FILE_BYTES:
            findings.append((number, "oversized_unscanned_file"))
            continue
        for reason in check_bytes(contents):
            findings.append((number, reason))
    return findings


def main() -> int:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "-z"], cwd=ROOT,
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20
    )
    entries = []
    for raw in result.stdout.split(b"\0"):
        if not raw:
            continue
        path = raw.decode("utf-8", "surrogateescape")
        data = (ROOT / path).read_bytes()
        entries.append((path, data))
    errors = audit_entries(entries)
    if errors:
        for number, reason in errors:
            print(f"Potential secret: tracked file #{number}, reason={reason}", file=sys.stderr)
        print("Rejecting PR. Check the file locally; do not paste credential values into CI logs.", file=sys.stderr)
        return 1
    print(f"Tracked-source credential scan passed ({len(entries)} files, high-confidence patterns only).")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        # Do not interpolate underlying exception: it can include sensitive paths.
        print("Credential scan failed closed: unable to enumerate/read tracked files.", file=sys.stderr)
        sys.exit(2)
