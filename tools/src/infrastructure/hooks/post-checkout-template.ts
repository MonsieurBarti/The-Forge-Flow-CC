export const TFF_HOOK_MARKER = '# tff post-checkout hook';

export const postCheckoutHookScript = `#!/bin/sh
# tff post-checkout hook — restores .tff/ state on branch switch
# $1=prev HEAD, $2=new HEAD, $3=1 if branch checkout (0 if file checkout)

[ "$3" = "1" ] || exit 0

BRANCH=$(git branch --show-current)
[ -z "$BRANCH" ] && exit 0

command -v node >/dev/null 2>&1 || exit 0

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
TFF_TOOLS="$REPO_ROOT/tools/dist/tff-tools.cjs"
[ -f "$TFF_TOOLS" ] || exit 0

mkdir -p "$REPO_ROOT/.tff"

node "$TFF_TOOLS" hook:post-checkout "$BRANCH" >> "$REPO_ROOT/.tff/hook.log" 2>&1

if [ -x "$(dirname "$0")/post-checkout.pre-tff" ]; then
  "$(dirname "$0")/post-checkout.pre-tff" "$@" || true
fi

exit 0
`;
