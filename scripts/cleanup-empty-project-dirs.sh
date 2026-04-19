#!/usr/bin/env bash
# Prune empty project skeletons from ~/.tff-cc/ (or $TFF_CC_HOME).
#
# A "skeleton" is a UUID-named dir containing only the standard subdirs
# (milestones/, worktrees/, journal/) with no state.db, no PROJECT.md,
# no .tff-project-id, and no other files. These are side effects of
# getProjectId() firing against the real home during test runs that
# didn't set TFF_CC_HOME to a tmpdir.
#
# Usage:
#   scripts/cleanup-empty-project-dirs.sh            # dry-run (default)
#   scripts/cleanup-empty-project-dirs.sh --apply    # actually delete

set -euo pipefail

HOME_DIR="${TFF_CC_HOME:-$HOME/.tff-cc}"
APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
	APPLY=1
fi

if [[ ! -d "$HOME_DIR" ]]; then
	echo "No tff-cc home at $HOME_DIR — nothing to do."
	exit 0
fi

UUID_RE='^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

kept=()
removed=()

shopt -s nullglob
for d in "$HOME_DIR"/*/; do
	name="$(basename "$d")"
	if [[ ! "$name" =~ $UUID_RE ]]; then
		kept+=("$name (not a project UUID)")
		continue
	fi

	has_state=0
	[[ -f "$d/state.db" ]] && has_state=1
	[[ -f "$d/PROJECT.md" ]] && has_state=1
	[[ -f "$d/.tff-project-id" ]] && has_state=1
	[[ -f "$d/STATE.md" ]] && has_state=1
	[[ -f "$d/settings.yaml" ]] && has_state=1

	# Any non-skeleton file at top level also disqualifies it.
	while IFS= read -r -d '' entry; do
		base="$(basename "$entry")"
		case "$base" in
			milestones|worktrees|journal) ;;
			*) has_state=1 ;;
		esac
	done < <(find "$d" -mindepth 1 -maxdepth 1 -print0)

	# Any file inside milestones/worktrees/journal also disqualifies it.
	for sub in milestones worktrees journal; do
		if [[ -d "$d$sub" ]]; then
			if [[ -n "$(find "$d$sub" -mindepth 1 -print -quit 2>/dev/null)" ]]; then
				has_state=1
			fi
		fi
	done

	if (( has_state == 1 )); then
		label=""
		[[ -f "$d/PROJECT.md" ]] && label="$(head -1 "$d/PROJECT.md" | sed 's/^# *//')"
		kept+=("$name${label:+ — $label}")
	else
		removed+=("$d")
	fi
done

echo "TFF_CC_HOME: $HOME_DIR"
echo
echo "Will KEEP (${#kept[@]}):"
for k in "${kept[@]}"; do echo "  $k"; done
echo
echo "Will REMOVE (${#removed[@]} empty skeletons):"
for r in "${removed[@]}"; do echo "  $(basename "$r")"; done

if (( APPLY == 0 )); then
	echo
	echo "Dry-run. Re-run with --apply to delete."
	exit 0
fi

echo
echo "Applying..."
for r in "${removed[@]}"; do
	rm -rf "$r"
done
echo "Removed ${#removed[@]} skeletons."
