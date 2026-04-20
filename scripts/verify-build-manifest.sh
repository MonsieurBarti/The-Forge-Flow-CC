#!/bin/sh
# verify-build-manifest.sh
#
# Asserts that dist/cli/index.js matches the bundleSha256 recorded in
# dist/.build-manifest.json. Exit 0 on match, non-zero on mismatch or
# missing files. Used by release-branch-validation.yml.

set -e

MANIFEST="dist/.build-manifest.json"
BUNDLE="dist/cli/index.js"

if [ ! -f "$MANIFEST" ]; then
  echo "error: $MANIFEST missing" >&2
  exit 2
fi

if [ ! -f "$BUNDLE" ]; then
  echo "error: $BUNDLE missing" >&2
  exit 2
fi

EXPECTED=$(sed -n 's/.*"bundleSha256" *: *"\([0-9a-f]*\)".*/\1/p' "$MANIFEST")
if [ -z "$EXPECTED" ]; then
  echo "error: could not parse bundleSha256 from $MANIFEST" >&2
  exit 3
fi

# macOS uses `shasum -a 256`; linux has `sha256sum`. Prefer sha256sum.
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$BUNDLE" | awk '{print $1}')
else
  ACTUAL=$(shasum -a 256 "$BUNDLE" | awk '{print $1}')
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "error: bundle sha256 mismatch" >&2
  echo "  manifest: $EXPECTED" >&2
  echo "  actual:   $ACTUAL"   >&2
  exit 1
fi

echo "ok: bundle sha256 matches manifest ($EXPECTED)"
