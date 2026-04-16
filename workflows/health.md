# Health

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. CHECK plannotator installed
2. CHECK state consistency: `tff-tools slice:list` ∧ `tff-tools milestone:list`
   - verify markdown ↔ SQLite mismatches, orphans, worktree integrity
3. CHECK stale-vs-PR status:
   - ∀ non-closed slice from `tff-tools slice:list`:
     - extract slice ID (e.g. `M02-S01`)
     - `gh pr list --state merged --head slice/<slice-id> --json number` → if merged PR ∃ but slice is open:
       - report as stale: `⚠ <slice-id>: slice is <status> but PR #<N> is merged`
   - ∀ non-closed milestone from `tff-tools milestone:list`:
     - if all child slices are closed → report: `⚠ <milestone>: all slices closed but milestone still open`
4. CHECK stale claims: `tff-tools claim:check-stale`
   - Parse result → if `count > 0`:
     - ∀ stale claim: report `⚠ Task <id> (<title>) claimed at <claimedAt> — exceeds 30min TTL`
   - Add row to health report table: `| Stale claims | OK/X stale |`
5. REPORT:
   ```
   | Check | Status |
   |---|---|
   | plannotator | OK/MISSING |
   | State consistency | OK/X mismatches |
   | Slice-PR sync | OK/X stale slices |
   | Stale claims | OK/X stale |
   | Worktrees | OK/X orphans |
   ```
6. stale slices found → ask user: "Close stale slices?" → yes → `tff-tools slice:close --slice-id <id> --reason "PR already merged"`
7. other issues found → offer `/tff:sync` to reconcile

8. NEXT: @references/next-steps.md
