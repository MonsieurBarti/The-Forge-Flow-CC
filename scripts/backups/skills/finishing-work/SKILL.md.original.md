---
name: finishing-work
description: "Use when shipping work. Pre-PR checklist, structured merge/PR decision, branch cleanup."
---

# Finishing Work

## When to Use

∀ ship workflow, after reviews pass.

## Pre-PR Checklist

Before creating PR, verify:
1. ∀ tests pass (fresh run, ¬cached)
2. ∀ lint/typecheck pass
3. No debug code (console.log, debugger, TODO)
4. Commits follow conventions
5. Changes match plan (¬ scope creep)
6. No generated files committed
7. No secrets (.env, credentials, API keys)

## PR Creation

```bash
gh pr create --base <target-branch> --head <feature-branch> \
  --title "<type>(<scope>): <summary>" \
  --body "$(cat <<'EOF'
## Summary
<what and why>

## Acceptance Criteria
- [x] AC1: ...
- [x] AC2: ...

## Test Plan
- [ ] Manual verification of ...
EOF
)"
```

## Merge Gate

- NEVER merge directly — only create PR
- User approves ∧ merges via GitHub
- After merge: cleanup worktree, close slice via tff-tools, delete branches

## Anti-Patterns

- Merging without user approval
- Creating PR before all reviews pass
- Leaving stale worktrees after merge
- Force-pushing to shared branches

## Rules

- ∀ PR: show URL to user
- ∀ cleanup: worktree delete, branch delete (local + remote)
- ∀ merge: rebase milestone branch on origin
