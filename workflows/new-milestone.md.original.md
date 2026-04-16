# New Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. ASK user: milestone name (e.g. "MVP", "Auth System"), goal
2. CREATE: `tff-tools milestone:create --name "<name>"`
   - creates milestone entry + `milestone/M0X` branch (from main)
3. REQUIREMENTS: ask user for requirements scoped to this milestone → write `.tff/milestones/<M0X>/REQUIREMENTS.md`
4. DEFINE SLICES: ask user to break milestone into slices (name, desc, deps)
5. CREATE slices:
   - ∀ slice: `tff-tools slice:create --title "<name>"`
   - ∀ dependency: `tff-tools dep:add --from-id <from-id> --to-id <to-id>`
6. SUMMARY: show milestone structure + slice ordering
   - suggest `/tff:discuss`
7. NEXT: @references/next-steps.md
