# Health

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. CHECK beads: `bd --version`
2. CHECK plannotator installed
3. CHECK state consistency: beads vs markdown mismatches, orphans, worktree integrity
4. CHECK bead-vs-PR status:
   - `bd list --label tff:slice --json` → for each non-closed slice:
     - extract slice ID from design field (e.g. `M02-S01`)
     - `gh pr list --state merged --head slice/<slice-id> --json number` → if merged PR exists but bead is open:
       - report as stale: `⚠ <slice-id>: bead is <status> but PR #<N> is merged`
   - `bd list --label tff:milestone --json` → for each non-closed milestone:
     - if all child slices are closed → report: `⚠ <milestone>: all slices closed but milestone bead is still open`
5. CHECK stale claims: `tff-tools claim:check-stale`
   - Parse result → if `count > 0`:
     - ∀ stale claim: report `⚠ Task <id> (<title>) claimed at <claimedAt> — exceeds 30min TTL`
   - Add row to health report table: `| Stale claims | OK/X stale |`
6. REPORT:
   ```
   | Check | Status |
   |---|---|
   | beads CLI | OK/MISSING |
   | plannotator | OK/MISSING |
   | State consistency | OK/X mismatches |
   | Bead-PR sync | OK/X stale beads |
   | Stale claims | OK/X stale |
   | Worktrees | OK/X orphans |
   ```
7. stale beads found → AskUserQuestion: "Close stale beads?" → yes → `bd close <id> --reason "PR already merged"`
8. other issues found → offer `/tff:sync` to reconcile

## Adapter Mode
Check `bd --version`:
- success → `beads: active`
- fail → `beads: unavailable (markdown-only mode)` — **strongly recommend installing beads**:
  ```
  ⚠️  Running in markdown-only mode (degraded).
  Beads provides atomic task claiming, dependency graphs, and real-time coordination.
  Without it, tff works but you lose wave parallelism, task locking, and team sync.

  Install: npm install -g @beads/bd
  Setup:   brew install dolt && dolt sql-server --port=3306
  Then:    /tff:sync to hydrate from existing state
  ```

9. NEXT: @references/next-steps.md
