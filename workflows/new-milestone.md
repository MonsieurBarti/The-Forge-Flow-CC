# New Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. ASK user: milestone name (e.g. "MVP", "Auth System"), goal
2. CREATE: `tff-tools milestone:create "<name>"`
   - creates `tff:milestone` bead + `milestone/M01` branch (from main)
3. DEFINE SLICES: ask user to break milestone into slices (name, desc, deps)
4. CREATE slice beads w/ dependencies
5. SUMMARY: show milestone structure + slice ordering
   - suggest `/tff:discuss`
6. NEXT: @references/next-steps.md
