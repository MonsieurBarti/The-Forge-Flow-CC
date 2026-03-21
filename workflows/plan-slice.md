# Plan Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = planning

## Steps
1. DECOMPOSE: slice → tasks w/ acceptance criteria + dependencies (1 task = 1 commit)
2. WRITE `.tff/slices/<slice-id>/PLAN.md`: goal, tasks[desc, criteria, deps], tier
3. CREATE task beads w/ dependencies
4. DETECT WAVES: `tff-tools waves:detect '<tasks-json>'` → show user
5. SPAWN tff-architect (F-lite ∧ F-full): validate plan structure
6. REVIEW: `plannotator annotate .tff/slices/<slice-id>/PLAN.md`
   - feedback → revise → re-submit | approved → continue
7. WORKTREE: `tff-tools worktree:create <slice-id>`
8. TRANSITION: `tff-tools slice:transition <id> executing`
9. NEXT: @references/next-steps.md
