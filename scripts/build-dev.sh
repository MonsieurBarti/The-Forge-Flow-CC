#!/usr/bin/env bash
# Build the tff-dev plugin: copy shared source + generate tff-dev commands.
# Produces a complete standalone plugin at plugin-dev/.
# Idempotent — safe to re-run.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$REPO_ROOT/plugin-dev"

# 1. Copy shared directories
for dir in workflows skills agents tools hooks references; do
  rm -rf "$DEST/$dir"
  cp -R "$REPO_ROOT/$dir" "$DEST/$dir"
done

# 2. Generate tff-dev commands
SRC_CMD="$REPO_ROOT/commands/tff"
DST_CMD="$DEST/commands/tff-dev"
mkdir -p "$DST_CMD"
rm -f "$DST_CMD"/*.md

count=0
for src in "$SRC_CMD"/*.md; do
  filename="$(basename "$src")"
  sed \
    -e 's/name: tff:/name: tff-dev:/g' \
    -e 's|/tff:|/tff-dev:|g' \
    "$src" > "$DST_CMD/$filename"
  count=$((count + 1))
done

echo "[build-dev] Copied shared dirs + generated $count commands → plugin-dev/"
