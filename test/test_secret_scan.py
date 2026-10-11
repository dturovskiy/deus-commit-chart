from __future__ import annotations

import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "ci" / "check_secrets.py"
SPEC = importlib.util.spec_from_file_location("chart_secret_scan", SCRIPT)
SCAN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SCAN)


class SecretScanTests(unittest.TestCase):
    def test_detects_github_tokens_private_keys_and_long_password_assignments(self):
        gh = ("gh" + "p_" + "Z" * 40).encode()
        private_key = ("-----BEGIN " + "OPENSSH PRIVATE KEY-----").encode()
        password = ("password='" + "x" * 38 + "'").encode()
        self.assertIn("github_token", SCAN.check_bytes(gh))
        self.assertIn("private_key_pem", SCAN.check_bytes(private_key))
        self.assertIn("long_literal_credential_assignment", SCAN.check_bytes(password))

    def test_no_match_on_github_actions_expressions_and_benign_identifiers(self):
        safe = (
            b"DEUS_COMMIT_CHART_GITHUB_TOKEN: " + bytes([36]) + b"{{ secrets.MY_TOKEN || github.token }}\n"
            b"token: 'TEST_ONLY'\n"
            b"snapshotId: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'\n"
            b"Do not include a secret or password in output\n"
        )
        self.assertEqual(SCAN.check_bytes(safe), [])

    def test_flags_env_and_key_files_without_exposing_values_or_names(self):
        findings = SCAN.audit_entries([
            ("src/app.js", b"console.log('safe');"),
            (".env.production", b"not-a-token"),
            ("notes/config.key", b"not-a-token"),
        ])
        self.assertIn((2, "sensitive_filename"), findings)
        self.assertIn((3, "sensitive_filename"), findings)
        self.assertNotIn("not-a-token", str(findings))

    def test_oversized_file_fails_closed(self):
        findings = SCAN.audit_entries([("large.txt", b"x" * (SCAN.MAX_FILE_BYTES + 1))])
        self.assertEqual(findings, [(1, "oversized_unscanned_file")])

    def test_findings_do_not_contain_credential_text(self):
        token = "github_" + "pat_" + "secretsecretsecretsecret"
        findings = SCAN.audit_entries([("sensitive-file", token.encode())])
        self.assertTrue(findings)
        self.assertNotIn(token, repr(findings))


if __name__ == "__main__":
    unittest.main()
