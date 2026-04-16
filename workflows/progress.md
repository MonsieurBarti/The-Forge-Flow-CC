# Progress

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. SYNC: `tff-tools sync:state --milestone-id <milestone-id>`
2. DISPLAY `.tff/STATE.md`: milestone progress (slices done/total), per-slice status + tasks, blocked items
3. ROUTE by current state:
   - discussing → `/tff:discuss` | planning → `/tff:plan`
   - executing → `/tff:execute` | verifying → `/tff:verify`
   - all closed → `/tff:complete-milestone`
4. NEXT: @references/next-steps.md
