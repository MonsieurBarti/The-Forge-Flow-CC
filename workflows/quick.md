# Quick (Entry-Point Shortcut)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Skips discuss + research. Creates slice, writes lightweight plan, then hands off to standard pipeline.

## Prerequisites
active milestone exists

## Steps
1. CREATE slice:
   - Create slice via `tff-tools`
   - Create worktree: `tff-tools worktree:create <slice-id>` → worktree at `.tff/worktrees/<slice-id>/`
2. CLASSIFY: AskUserQuestion → user picks tier (S / F-lite / F-full)
   - Default suggestion: S (if user described a single-file fix) or F-lite
3. PLAN (lightweight): ask user for 1-2 sentence desc → single task in PLAN.md
   - Write to `.tff/milestones/<milestone>/slices/<id>/PLAN.md`
4. HAND OFF to standard pipeline:
   - invoke plan-slice workflow from step 8 (Plannotator Review) onward
   - then: execute-slice → verify-slice → ship-slice (standard workflows)

Quick is an entry point, not a parallel pipeline.
