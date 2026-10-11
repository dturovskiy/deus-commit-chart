"""Offline tests for the read-only GitHub README cache observer."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "ci" / "probe-readme-cache.py"
spec = importlib.util.spec_from_file_location("chart_cache_probe", SCRIPT)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

SAMPLER = Path(__file__).resolve().parents[1] / "ci" / "sample-readme-cache.py"
sampler_spec = importlib.util.spec_from_file_location("chart_cache_sampler", SAMPLER)
sampler = importlib.util.module_from_spec(sampler_spec)
sampler_spec.loader.exec_module(sampler)

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

    def test_longitudinal_sample_matches_do_not_imply_cache_sla(self):
        samples = [
            {"state": "profile_raw_matched",
             "snapshotAgeAtProbeSeconds": age,
             "observations": {"profile": {"embedHost": "raw.githubusercontent.com"}},
             "independentImageProxyObserved": False}
            for age in (8.5, 23.7, 40.0)
        ]
        report = sampler.summarize_observations(samples)
        self.assertEqual(report["sampleCount"], 3)
        self.assertEqual(report["observedTransitions"], [])
        self.assertFalse(report["independentImageProxyObserved"])
        self.assertFalse(report["cacheSlaEstablished"])

    def test_longitudinal_transition_requires_same_actual_embed_host(self):
        raw_lag = {"state": "profile_raw_lag_observed",
                   "snapshotAgeAtProbeSeconds": 10,
                   "observations": {"profile": {"embedHost": "raw.githubusercontent.com"}}}
        camo_match = {"state": "proxy_matched",
                      "snapshotAgeAtProbeSeconds": 20,
                      "observations": {"profile": {"embedHost": "camo.githubusercontent.com"}},
                      "independentImageProxyObserved": True}
        self.assertEqual(sampler.summarize_observations([raw_lag, camo_match])["observedTransitions"], [])
        raw_match = {"state": "profile_raw_matched",
                     "snapshotAgeAtProbeSeconds": 25,
                     "observations": {"profile": {"embedHost": "raw.githubusercontent.com"}}}
        report = sampler.summarize_observations([raw_lag, raw_match])
        self.assertEqual(report["observedTransitions"], [{
            "embedHost": "raw.githubusercontent.com",
            "lastStaleSnapshotAgeSeconds": 10,
            "firstFreshSnapshotAgeSeconds": 25
        }])
        self.assertFalse(report["cacheSlaEstablished"])

if __name__ == "__main__":
    unittest.main()
