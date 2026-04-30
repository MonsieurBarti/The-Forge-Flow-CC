# Progress

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. SYNC milestone STATE: `tff-tools sync:state --milestone-id <milestone-id>` (if milestone ∃)
2. SYNC quick STATE (if any quick slices ∃): `tff-tools sync:state --kind quick`
   - Probe: `tff-tools slice:list --kind quick` → if data is non-empty, run sync.
3. SYNC debug STATE (if any debug slices ∃): `tff-tools sync:state --kind debug`
   - Probe: `tff-tools slice:list --kind debug` → if data is non-empty, run sync.
4. DISPLAY:
   - `.tff-cc/STATE.md`: milestone progress (slices done/total), per-slice status + tasks
   - `.tff-cc/quick/STATE.md` (if ∃): in-progress quick tasks
   - `.tff-cc/debug/STATE.md` (if ∃): in-progress debug tasks
5. ROUTE by current state:
   - discussing → `/tff:discuss` | planning → `/tff:plan`
   - executing → `/tff:execute` | verifying → `/tff:verify`
   - all closed → `/tff:complete-milestone`
6. NEXT: @references/next-steps.md
