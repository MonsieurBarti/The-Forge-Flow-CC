#!/bin/sh
# sync-release-branch.sh
#
# Assemble a consumer-facing release tree (plugin manifest + content dirs +
# built dist/ + native binaries + top-level docs) and force-push it to the
# `release` branch on origin. The marketplace.json on main pins consumers to
# this branch via `source: { source: "github", repo: ..., ref: "release" }`,
# so the release branch IS the distribution channel.
#
# SAFE LOCAL TEST (before trusting CI with this):
#   1. git remote add testfork <your-test-fork-url>
#   2. Temporarily edit this script: change `git push --force origin release`
#      to `git push --force testfork release`.
#   3. bun run build && bash scripts/sync-release-branch.sh
#   4. Inspect the test fork's `release` branch on GitHub.
#   5. In a throwaway project: `claude /plugin marketplace add <fork>` and
#      `claude /plugin install tff-cc@the-forge-flow`; verify commands load.
#   6. Once verified, revert the script edit before merging.
#
# This script is invoked from .github/workflows/release.yml AFTER
# release-please cuts a release and npm publish succeeds, so a force-push
# here always reflects a tagged, published version.

set -e

# --- Preconditions -----------------------------------------------------------

if [ ! -f dist/cli/index.js ]; then
  echo "error: dist/cli/index.js missing — run 'bun run build' first" >&2
  exit 1
fi

if [ ! -f plugin/.claude-plugin/plugin.json ]; then
  echo "error: plugin/.claude-plugin/plugin.json missing" >&2
  exit 1
fi

SOURCE_SHA=$(git rev-parse --short HEAD)
ORIGIN_URL=$(git config --get remote.origin.url || true)
if [ -z "$ORIGIN_URL" ]; then
  echo "error: remote 'origin' not configured" >&2
  exit 1
fi

RELEASE_DIR=$(mktemp -d -t tff-release-XXXXXX)
trap 'rm -rf "$RELEASE_DIR"' EXIT

echo "Assembling release tree at $RELEASE_DIR..."
echo "  source sha: $SOURCE_SHA"
echo "  origin:     $ORIGIN_URL"

# --- 1. Plugin manifest at .claude-plugin/plugin.json (release root) ---------

echo "Copying plugin manifest..."
mkdir -p "$RELEASE_DIR/.claude-plugin"
cp plugin/.claude-plugin/plugin.json "$RELEASE_DIR/.claude-plugin/plugin.json"

# --- 2. Plugin content dirs (resolve symlinks: plugin/X -> real ./X) ---------

echo "Copying plugin content dirs (resolving symlinks)..."
for sub in agents commands hooks references skills tools workflows; do
  if [ -e "plugin/$sub" ]; then
    cp -rL "plugin/$sub" "$RELEASE_DIR/$sub"
  else
    echo "  warn: plugin/$sub not found, skipping" >&2
  fi
done

# --- 3. Built dist/ ----------------------------------------------------------

echo "Copying dist/..."
cp -r dist "$RELEASE_DIR/dist"

# --- 4. Native SQLite binaries ----------------------------------------------

if [ -d native ]; then
  echo "Copying native/*.node into dist/infrastructure/adapters/sqlite/..."
  mkdir -p "$RELEASE_DIR/dist/infrastructure/adapters/sqlite"
  # `|| true` so an empty native/ doesn't abort; explicit log below tells us.
  cp native/*.node "$RELEASE_DIR/dist/infrastructure/adapters/sqlite/" 2>/dev/null || true
  COPIED=$(ls "$RELEASE_DIR/dist/infrastructure/adapters/sqlite/"*.node 2>/dev/null | wc -l | tr -d ' ')
  echo "  copied $COPIED native binaries"
fi

# --- 5. Top-level files ------------------------------------------------------

echo "Copying top-level files..."
cp package.json "$RELEASE_DIR/"
[ -f README.md ]    && cp README.md    "$RELEASE_DIR/"
[ -f CHANGELOG.md ] && cp CHANGELOG.md "$RELEASE_DIR/"
[ -f LICENSE ]      && cp LICENSE      "$RELEASE_DIR/"

# --- 6. Minimal .gitignore (does NOT ignore dist/) ---------------------------

cat > "$RELEASE_DIR/.gitignore" <<'EOF'
node_modules/
*.log
.DS_Store
EOF

# --- 7. Init fresh git repo and force-push release branch --------------------

cd "$RELEASE_DIR"
echo "Initializing release git tree..."
git init -q
git remote add origin "$ORIGIN_URL"
git checkout -q -b release
git add -A
git -c user.name="tff-release-bot" -c user.email="release@tff-cc.invalid" \
  commit -q -m "release: snapshot built from $SOURCE_SHA"

echo "Force-pushing to $ORIGIN_URL release..."
git push --force origin release

echo "Done."
