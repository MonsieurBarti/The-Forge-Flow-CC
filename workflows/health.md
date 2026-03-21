# Health

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. CHECK beads: `bd --version`
2. CHECK plannotator installed
3. CHECK state consistency: beads vs markdown mismatches, orphans, worktree integrity
4. REPORT:
   ```
   | Check | Status |
   |---|---|
   | beads CLI | OK/MISSING |
   | plannotator | OK/MISSING |
   | State consistency | OK/X mismatches |
   | Worktrees | OK/X orphans |
   ```
5. issues found → offer `/tff:sync` to reconcile

## Adapter Mode
Check `bd --version`:
- success → `beads: active`
- fail → `beads: unavailable (markdown-only mode)`
Report adapter mode to user.

6. NEXT: @references/next-steps.md
