# New Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. ASK user: milestone name (e.g. "MVP", "Auth System"), goal
2. CREATE: `tff-tools milestone:create "<name>"`
   - creates `tff:milestone` bead + `milestone/M0X` branch (from main)
3. REQUIREMENTS: ask user for requirements scoped to this milestone → write `.tff/REQUIREMENTS.md`
   - If REQUIREMENTS.md exists, ask whether to replace or append
4. DEFINE SLICES: ask user to break milestone into slices (name, desc, deps)
5. CREATE slice beads w/ dependencies
6. SUMMARY: show milestone structure + slice ordering
   - suggest `/tff:discuss`
7. NEXT: @references/next-steps.md
