#!/usr/bin/env python3
"""Offline XML/safety validation for static GitHub README SVGs.

Uses only Python's standard library. It is a release CI gate, not a runtime
dependency for the reusable GitHub Action or the local Node CLI.
"""
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
NAMES = ("activity-30d.svg", "activity-90d.svg", "activity-365d.svg")


def check_svg(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
        raise ValueError(f"{path}: DTD/entity declarations are forbidden")
    if re.search(r"\b(?:NaN|Infinity)\b", text):
        raise ValueError(f"{path}: nonfinite SVG geometry")
    root = ET.fromstring(text)
    if root.tag != f"{{{SVG_NS}}}svg":
        raise ValueError(f"{path}: root is not an SVG element")
    if not root.attrib.get("viewBox") or root.find(f"{{{SVG_NS}}}title") is None:
        raise ValueError(f"{path}: missing accessible title or viewBox")

    valid_paths = 0
    for node in root.iter():
        local_name = node.tag.rsplit("}", 1)[-1]
        if local_name.lower() in {"script", "foreignobject", "iframe", "image"}:
            raise ValueError(f"{path}: forbidden embedded element {local_name}")
        if local_name == "path":
            valid_paths += int(bool(node.get("d")))
        for key, value in node.attrib.items():
            name = key.rsplit("}", 1)[-1].lower()
            if name in {"href", "src"} and (
                value.startswith(("http:", "https:", "//", "data:", "javascript:"))
            ):
                raise ValueError(f"{path}: remote or executable resource reference")
    if valid_paths < 2:
        raise ValueError(f"{path}: expected daily and trend paths")


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python3 ci/validate-svg.py DIRECTORY", file=sys.stderr)
        return 2
    directory = pathlib.Path(sys.argv[1])
    try:
        for name in NAMES:
            check_svg(directory / name)
            print(f"XML validated: {name}")
    except (OSError, ET.ParseError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
