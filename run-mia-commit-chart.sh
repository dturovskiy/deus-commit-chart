#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${BRANCH:-main}"
TITLE="${TITLE:-mia-platform commit activity}"

resolve_windows_downloads() {
  if [ -n "${WIN_DOWNLOADS:-}" ]; then
    printf '%s\n' "$WIN_DOWNLOADS"
    return 0
  fi

  if command -v cmd.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
    local win_home
    win_home="$(cmd.exe /c '<nul set /p=%USERPROFILE%' 2>/dev/null | tr -d '\r')"
    if [ -n "$win_home" ]; then
      printf '%s/Downloads\n' "$(wslpath -u "$win_home")"
      return 0
    fi
  fi

  printf '%s\n' "$HOME/Downloads"
}

find_target_repo() {
  if [ -n "${TARGET_REPO:-}" ]; then
    printf '%s\n' "$TARGET_REPO"
    return 0
  fi

  if [ -n "${MIA_REPO:-}" ]; then
    printf '%s\n' "$MIA_REPO"
    return 0
  fi

  find "$HOME" -maxdepth 6 -type d -name "mia-platform" 2>/dev/null | head -n 1
}

TARGET_REPO="$(find_target_repo)"
[ -n "$TARGET_REPO" ] || {
  echo "Set TARGET_REPO=/path/to/git/repo and run again." >&2
  exit 1
}

[ -d "$TARGET_REPO/.git" ] || {
  echo "Not a Git repository: $TARGET_REPO" >&2
  exit 1
}

OUT_FILE="${OUT_FILE:-$(resolve_windows_downloads)/mia-commit-chart.html}"
mkdir -p "$(dirname "$OUT_FILE")"

node "$SCRIPT_DIR/generate-commit-chart.js" \
  --repo "$TARGET_REPO" \
  --branch "$BRANCH" \
  --out "$OUT_FILE" \
  --title "$TITLE"

if command -v explorer.exe >/dev/null 2>&1; then
  explorer.exe "$(wslpath -w "$OUT_FILE" 2>/dev/null || printf '%s' "$OUT_FILE")" >/dev/null 2>&1 || true
fi

printf 'Wrote %s\n' "$OUT_FILE"
