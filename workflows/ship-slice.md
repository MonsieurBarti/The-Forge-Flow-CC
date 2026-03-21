# Workflow: Ship Slice

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Slice is in `reviewing` status

## Steps

### 1. Fresh reviewer enforcement
```bash
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> code-reviewer
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> security-auditor
```

### 2. Spawn review agents (parallel)
- **tff-code-reviewer** — reviews code quality
- **tff-security-auditor** — reviews security
- **tff-architect** — reviews structural changes (if any)

### 3. Code review via plannotator
```bash
plannotator review
```
User reviews the code changes in the slice worktree.

### 4. Handle review outcome
- **Approved** → proceed to merge
- **Changes requested** → spawn **tff-fixer** agent, then re-review

### 5. Create slice PR
Create PR: `slice/<slice-id>` → `milestone/<milestone>`

### 6. Merge and cleanup
After PR approval:
- Merge slice branch into milestone branch
- Delete worktree
- Close slice bead
- Transition to completing → closed

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
