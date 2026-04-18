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

# --- CI-only guard -----------------------------------------------------------
# This script force-pushes to origin/release. Refuse to run outside GitHub
# Actions unless the caller opts in with TFF_RELEASE_SYNC_CONFIRM=yes
# (used for the SAFE LOCAL TEST flow documented above).
if [ -z "$GITHUB_ACTIONS" ] && [ "$TFF_RELEASE_SYNC_CONFIRM" != "yes" ]; then
  echo "error: refusing force-push from non-CI context." >&2
  echo "  set TFF_RELEASE_SYNC_CONFIRM=yes to opt in (see SAFE LOCAL TEST block)." >&2
  exit 1
fi

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

echo "Copying plugin content dirs (resolving top-level symlinks only)..."
# plugin/<sub> is a committed symlink to ../<sub>. We intentionally resolve
# that top-level hop, but any *nested* symlinks must NOT be dereferenced —
# `rsync -a --safe-links` drops links that escape the source tree so a
# hypothetical plugin/agents/evil -> /etc/passwd cannot leak into consumers.
for sub in agents commands hooks references skills tools workflows; do
  plugin_entry="plugin/$sub"
  if [ ! -e "$plugin_entry" ]; then
    echo "  warn: $plugin_entry not found, skipping" >&2
    continue
  fi
  if [ -L "$plugin_entry" ]; then
    # Resolve the top-level symlink (always points to ../$sub in this repo).
    src=$(cd "plugin" && readlink -f "$sub")
  else
    src=$(cd "$(dirname "$plugin_entry")" && pwd)/$sub
  fi
  if [ ! -d "$src" ]; then
    echo "  warn: $src is not a directory after resolving, skipping" >&2
    continue
  fi
  rsync -a --safe-links "$src/" "$RELEASE_DIR/$sub/"
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

# The tmp git has no inherited credentials. For CI (GH Actions over HTTPS),
# embed $GITHUB_TOKEN as x-access-token into the push URL. For non-HTTPS
# origins (e.g. ssh:// or git@...), rely on the runner's existing credentials.
# $GITHUB_TOKEN is masked by GH Actions in any log output, so incidental
# echoing of PUSH_URL would not leak the token.
case "$ORIGIN_URL" in
  https://*)
    if [ -n "$GITHUB_TOKEN" ]; then
      HOST_PATH="${ORIGIN_URL#https://}"
      PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@${HOST_PATH}"
    else
      PUSH_URL="$ORIGIN_URL"
    fi
    ;;
  *)
    PUSH_URL="$ORIGIN_URL"
    ;;
esac

cd "$RELEASE_DIR"
echo "Initializing release git tree..."
git init -q
git remote add origin "$PUSH_URL"
git checkout -q -b release
git add -A
git -c user.name="tff-release-bot" -c user.email="release@tff-cc.invalid" \
  commit -q -m "release: snapshot built from $SOURCE_SHA"

echo "Force-pushing to $ORIGIN_URL release..."
git push --force origin release

echo "Done."
