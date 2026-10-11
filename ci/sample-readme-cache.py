#!/usr/bin/env python3
"""Bounded manual longitudinal read-only README image/cache observations.

Runs the existing allowlisted-host probe 1 or 3 times. A measured
stale-to-fresh transition bounds *that observation only*, never GitHub's
global cache invalidation SLA. No scheduled job, network redirect bypass,
cache busting, or persisted raw HTML/SVG.
"""
from __future__ import annotations
import json
import pathlib
import subprocess
import sys
import tempfile
import time

PROBE = pathlib.Path(__file__).with_name("probe-readme-cache.py")
LAG_STATES = {"profile_raw_lag_observed", "proxy_lag_observed"}
MATCH_STATES = {"profile_raw_matched", "proxy_matched"}


def summarize_observations(samples):
    if not samples:
        raise ValueError("At least one cache observation is required")
    observations = []
    previous_lag = {}
    transitions = []
    for sample in samples:
        state = sample.get("state", "unknown")
        age = sample.get("snapshotAgeAtProbeSeconds")
        host = sample.get("observations", {}).get("profile", {}).get("embedHost")
        observations.append({
            "state": state, "snapshotAgeAtProbeSeconds": age,
            "embedHost": host, "independentImageProxyObserved":
                sample.get("independentImageProxyObserved", False)
        })
        if state in LAG_STATES and isinstance(age, (int, float)) and host:
            previous_lag[host] = age
        elif state in MATCH_STATES and host in previous_lag and isinstance(age, (int, float)):
            if age >= previous_lag[host]:
                transitions.append({
                    "embedHost": host,
                    "lastStaleSnapshotAgeSeconds": previous_lag[host],
                    "firstFreshSnapshotAgeSeconds": age
                })
            del previous_lag[host]
    return {
        "sampleCount": len(samples), "observations": observations,
        "observedTransitions": transitions,
        "independentImageProxyObserved": any(
            sample.get("independentImageProxyObserved", False) for sample in samples
        ),
        "cacheSlaEstablished": False,
        "interpretation": (
            "Observed samples and any transition bounds apply only to this "
            "controlled read-only window; no universal cache TTL is established."
        )
    }


def main(argv=None):
    args = sys.argv if argv is None else argv
    if len(args) != 4:
        raise ValueError("Usage: sample-readme-cache.py MANIFEST OUTPUT_JSON 1|3")
    manifest, output, raw_count = args[1:]
    if raw_count not in ("1", "3"):
        raise ValueError("Only one or three bounded read-only samples are supported")
    count = int(raw_count)
    samples = []
    with tempfile.TemporaryDirectory(prefix="deus-cache-observations-") as temp:
        for index in range(count):
            if index:
                time.sleep(15)
            temporary_output = str(pathlib.Path(temp) / f"sample-{index}.json")
            result = subprocess.run(
                [sys.executable, str(PROBE), manifest, temporary_output],
                capture_output=True, text=True, timeout=75, check=False
            )
            if result.returncode:
                raise RuntimeError("Cache probe failed without printing fetched content")
            samples.append(json.loads(pathlib.Path(temporary_output).read_text()))
    report = summarize_observations(samples)
    pathlib.Path(output).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print("CACHE_OBSERVATION_FAILURE: " + type(exc).__name__, file=sys.stderr)
        raise SystemExit(1)
