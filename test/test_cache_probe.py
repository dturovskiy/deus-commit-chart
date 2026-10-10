"""Offline tests for the read-only GitHub README cache observer."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "ci" / "probe-readme-cache.py"
spec = importlib.util.spec_from_file_location("chart_cache_probe", SCRIPT)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

class CacheProbeTests(unittest.TestCase):
    def test_extracts_only_matching_profile_image(self):
        parser = probe.ChartImageParser()
        parser.feed('''<img src="https://camo.githubusercontent.com/other" alt="Another">'''
                    '''<img src="https://camo.githubusercontent.com/chart" '''
                    '''alt="GitHub contribution activity for the last 30 days">''')
        self.assertEqual(parser.sources, ["https://camo.githubusercontent.com/chart"])

    def test_svg_snapshot_match_and_mismatch(self):
        svg = b'<svg><text>Updated UTC - Snapshot 0123456789</text></svg>'
        result = probe.inspect_svg(svg, "0123456789" + "a"*54)
        self.assertTrue(result["matchesPublished"])
        self.assertFalse(probe.inspect_svg(svg, "f"*64)["matchesPublished"])
        self.assertIsNone(probe.inspect_svg(b"<svg></svg>", "f"*64)["snapshotPrefix"])

    def test_cache_classification_does_not_confuse_raw_embed_with_camo(self):
        self.assertEqual(probe.classify_observation(True, "raw.githubusercontent.com", True),
                         "profile_raw_matched")
        self.assertEqual(probe.classify_observation(True, "raw.githubusercontent.com", False),
                         "profile_raw_lag_observed")
        self.assertEqual(probe.classify_observation(True, "camo.githubusercontent.com", True),
                         "proxy_matched")
        self.assertEqual(probe.classify_observation(True, "camo.githubusercontent.com", False),
                         "proxy_lag_observed")
        self.assertEqual(probe.classify_observation(False, "raw.githubusercontent.com", False),
                         "direct_raw_lag_observed")
        self.assertEqual(probe.classify_observation(True, None, None),
                         "inconclusive")

    def test_untrusted_host_fails_before_network(self):
        for uri in ("http://github.com", "https://example.invalid/test",
                    "file:///etc/passwd", "https://github.com.evil.invalid"):
            with self.assertRaises(ValueError):
                probe.fetch(uri)

if __name__ == "__main__":
    unittest.main()
