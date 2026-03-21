# Workflow: Health

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Steps

### 1. Check beads CLI
```bash
bd --version
```

### 2. Check plannotator
Verify plannotator is installed.

### 3. Check state consistency
- Compare beads vs markdown — flag mismatches
- Check for orphaned beads or markdown files
- Verify worktree integrity

### 4. Report
```markdown
## Health Check

| Check | Status |
|---|---|
| beads CLI | OK/MISSING |
| plannotator | OK/MISSING |
| State consistency | OK/X mismatches |
| Worktrees | OK/X orphans |
```

### 5. Offer repair
If issues found, offer to run `/tff:sync` to reconcile.

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
