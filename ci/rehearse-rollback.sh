#!/usr/bin/env bash
# Rehearse publish → reject corrupted candidate → forward-only rollback
# against an isolated local bare Git remote. NEVER touches activity-assets.
set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: ci/rehearse-rollback.sh OLD_VERIFIED_DIR NEW_VERIFIED_DIR" >&2
  exit 2
fi
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
old="$(realpath "$1")"
new="$(realpath "$2")"
node "$root/verify-activity-assets.js" "$old"
node "$root/verify-activity-assets.js" "$new"
python3 "$root/ci/validate-svg.py" "$old"
python3 "$root/ci/validate-svg.py" "$new"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git init --quiet --bare "$tmp/remote.git"
git init --quiet -b activity-assets "$tmp/work"
git -C "$tmp/work" config user.name "CI Rollback Rehearsal"
git -C "$tmp/work" config user.email "rollback-ci@example.invalid"
git -C "$tmp/work" remote add origin "$tmp/remote.git"

copy_snapshot() {
  find "$tmp/work" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -a "$1"/. "$tmp/work"/
  git -C "$tmp/work" add -A
}
copy_snapshot "$old"
git -C "$tmp/work" commit --quiet -m 'snapshot: first verified'
first="$(git -C "$tmp/work" rev-parse HEAD)"
git -C "$tmp/work" push --quiet -u origin activity-assets

copy_snapshot "$new"
git -C "$tmp/work" commit --quiet -m 'snapshot: second verified'
second="$(git -C "$tmp/work" rev-parse HEAD)"
git -C "$tmp/work" push --quiet origin activity-assets

# Negative publish rehearsal: tampered artifacts must fail validation.
mkdir "$tmp/invalid"
cp -a "$new"/. "$tmp/invalid"/
printf '<!-- corrupted -->\n' >> "$tmp/invalid/activity-30d.svg"
before="$(git --git-dir="$tmp/remote.git" rev-parse refs/heads/activity-assets)"
if node "$root/verify-activity-assets.js" "$tmp/invalid"; then
  echo 'ERROR: verifier accepted a corrupted candidate' >&2
  exit 1
fi
after="$(git --git-dir="$tmp/remote.git" rev-parse refs/heads/activity-assets)"
[[ "$before" == "$after" && "$before" == "$second" ]] || {
  echo 'ERROR: rejected candidate modified the remote ref' >&2
  exit 1
}
echo 'Rejected corrupt candidate without mutating test remote'

# Forward-only rollback is a NEW commit, not a reset or force-push.
git -C "$tmp/work" restore --source="$first" --staged --worktree -- .
git -C "$tmp/work" commit --quiet -m 'revert: restore first verified snapshot'
third="$(git -C "$tmp/work" rev-parse HEAD)"
git -C "$tmp/work" push --quiet origin activity-assets
git -C "$tmp/work" merge-base --is-ancestor "$second" "$third"

mkdir "$tmp/restored"
git -C "$tmp/work" archive HEAD | tar -xf - -C "$tmp/restored"
node "$root/verify-activity-assets.js" "$tmp/restored"
python3 "$root/ci/validate-svg.py" "$tmp/restored"
cmp "$old/manifest.json" "$tmp/restored/manifest.json"
for asset in index.html activity-30d.svg activity-90d.svg activity-365d.svg; do
  cmp "$old/$asset" "$tmp/restored/$asset"
done
echo "Forward-only rollback PASS: first=$first second=$second restored=$third"
