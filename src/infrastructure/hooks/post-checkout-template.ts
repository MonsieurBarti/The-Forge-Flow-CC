export const TFF_HOOK_MARKER = '# tff post-checkout hook';

export const postCheckoutHookScript = `#!/bin/sh
# tff post-checkout hook — restores .tff/ state on branch switch
# $1=prev HEAD, $2=new HEAD, $3=1 if branch checkout (0 if file checkout)

[ "$3" = "1" ] || exit 0

BRANCH=$(git branch --show-current)
[ -z "$BRANCH" ] && exit 0

command -v node >/dev/null 2>&1 || exit 0

# Resolve main repo root (works in both main repo and worktrees)
GIT_COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
if [ -z "$GIT_COMMON_DIR" ]; then
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
else
  # git-common-dir is the .git directory (or .git/worktrees/<name>/..)
  # For main repo: /path/to/repo/.git -> parent is repo root
  # For worktrees: /path/to/repo/.git -> same
  REPO_ROOT=$(dirname "$GIT_COMMON_DIR")
fi
TFF_TOOLS="$REPO_ROOT/dist/cli/index.js"
[ -f "$TFF_TOOLS" ] || exit 0

CWD_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
mkdir -p "$CWD_ROOT/.tff"

node "$TFF_TOOLS" hook:post-checkout "$BRANCH" >> "$CWD_ROOT/.tff/hook.log" 2>&1

if [ -x "$(dirname "$0")/post-checkout.pre-tff" ]; then
  "$(dirname "$0")/post-checkout.pre-tff" "$@" || true
fi

exit 0
`;
