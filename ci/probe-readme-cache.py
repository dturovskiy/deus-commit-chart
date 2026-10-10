#!/usr/bin/env python3
"""Best-effort *observation* of GitHub profile README image-proxy cache.

Compare the published chart snapshot with the profile's rendered image URL.
One probe is a point-in-time measurement, NOT a bounded cache invalidation SLA.
This tool never mutates the profile, cache, or published assets.
"""
from __future__ import annotations
import html.parser
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from time import monotonic

PROFILE_URL = "https://github.com/dturovskiy"
RAW_URL = "https://raw.githubusercontent.com/dturovskiy/deus-commit-chart/activity-assets/activity-30d.svg"
UA = "deus-commit-chart-cache-audit/1.0 (read-only)"
MAX_BYTES = 1_000_000
HOSTS = {"github.com", "raw.githubusercontent.com", "camo.githubusercontent.com"}

class ChartImageParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []
    def handle_starttag(self, tag, attrs):
        if tag != "img":
            return
        attributes = dict(attrs)
        if attributes.get("alt") == "GitHub contribution activity for the last 30 days":
            self.sources.append(attributes.get("src") or "")

def fetch(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in HOSTS:
        raise ValueError("Rejected unexpected image/probe host")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,image/svg+xml,*/*"})
    started = monotonic()
    with urllib.request.urlopen(req, timeout=18) as resp:
        if urllib.parse.urlparse(resp.url).hostname not in HOSTS:
            raise ValueError("Unexpected HTTP redirect host")
        body = resp.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError("HTTP response exceeds bounded probe limit")
        headers = {k: resp.headers.get(k) for k in
                   ("Age", "Cache-Control", "Last-Modified", "ETag", "Via")
                   if resp.headers.get(k) is not None}
        return {"body": body, "status": resp.status, "headers": headers,
                "elapsedMs": round((monotonic() - started) * 1000)}

def inspect_svg(content, snapshot):
    text = content.decode("utf-8", errors="replace")
    seen = re.search(r"Snapshot ([a-f0-9]{10})", text)
    return {"snapshotPrefix": seen.group(1) if seen else None,
            "matchesPublished": bool(seen and seen.group(1) == snapshot[:10]),
            "contentBytes": len(content)}

def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: ci/probe-readme-cache.py PUBLISHED_MANIFEST OUTPUT_JSON")
    manifest = json.loads(pathlib.Path(sys.argv[1]).read_text())
    snapshot = manifest["snapshotId"]
    report = {"observedAt": datetime.now(timezone.utc).isoformat(),
              "publishedSnapshot": snapshot, "generatedAt": manifest["generatedAt"],
              "profile": PROFILE_URL, "state": "unknown", "observations": {}}
    try:
        raw = fetch(RAW_URL)
        report["observations"]["raw"] = {**inspect_svg(raw["body"], snapshot),
                                           "status": raw["status"], "headers": raw["headers"],
                                           "elapsedMs": raw["elapsedMs"]}
        page = fetch(PROFILE_URL)
        parser = ChartImageParser()
        parser.feed(page["body"].decode("utf-8", errors="replace"))
        if not parser.sources:
            report["observations"]["profile"] = {"state": "embed_not_found"}
        else:
            url = urllib.parse.urljoin(PROFILE_URL, parser.sources[0])
            report["observations"]["profile"] = {
                "embedHost": urllib.parse.urlparse(url).hostname,
                "httpStatus": page["status"], "httpElapsedMs": page["elapsedMs"]
            }
            proxied = fetch(url)
            report["observations"]["profileImage"] = {
                **inspect_svg(proxied["body"], snapshot), "status": proxied["status"],
                "headers": proxied["headers"], "elapsedMs": proxied["elapsedMs"]
            }
        direct = report["observations"].get("raw", {}).get("matchesPublished")
        proxy = report["observations"].get("profileImage", {}).get("matchesPublished")
        report["state"] = "matched" if direct and proxy else (
            "proxy_lag_observed" if direct and proxy is False else "inconclusive"
        )
    except (OSError, ValueError, urllib.error.URLError) as exc:
        # Observability is non-blocking: don't break verified chart publication.
        report["state"] = "probe_unavailable"
        report["error"] = type(exc).__name__ + ": " + str(exc)[:170]
    pathlib.Path(sys.argv[2]).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
