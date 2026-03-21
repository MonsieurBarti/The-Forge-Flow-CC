# Workflow: Rollback

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Steps

### 1. Load checkpoint
```bash
node <plugin-path>/tools/dist/tff-tools.cjs checkpoint:load <slice-id>
```

### 2. Identify commits to revert
From the checkpoint, get the list of execution commits (after base commit).

### 3. Revert commits
For each execution commit (in reverse order):
```bash
git revert --no-edit <sha>
```
Only revert code commits, not artifact commits (docs).

### 4. Update state
Reset completed tasks to `open` status. Update checkpoint.

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
