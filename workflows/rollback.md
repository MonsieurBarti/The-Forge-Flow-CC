# Rollback

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. LOAD: `tff-tools checkpoint:load <slice-id>`
2. IDENTIFY execution commits (after base commit) from checkpoint
3. REVERT each (reverse order): `git revert --no-edit <sha>`
   - only code commits, not artifact commits (docs)
4. UPDATE: reset completed tasks → `open`, update checkpoint
5. NEXT: @references/next-steps.md
