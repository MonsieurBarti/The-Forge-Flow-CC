# Quick (S-tier Shortcut)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Skip discuss + research → straight to plan, execute, ship.

## Prerequisites
active milestone exists

## Steps
1. CREATE slice as S-tier:
   - Create slice bead via `tff-tools`
   - Create worktree: `tff-tools worktree:create <slice-id>` → worktree at `.tff/worktrees/<slice-id>/`
2. PLAN (lightweight): ask user for 1-2 sentence desc → single task in PLAN.md, skip plannotator
3. EXECUTE: single wave, single task, spawn domain agent (working in `.tff/worktrees/<slice-id>/`), no TDD (S-tier)
4. VERIFY: spawn tff-product-lead for quick sanity check
5. SHIP: fresh reviewer enforcement, spec + code review (lightweight), create slice PR
   **Show PR URL to user**
6. MERGE GATE: AskUserQuestion → "PR merged" or "PR needs changes"
   - merged → `bd close <slice-bead-id> --reason "Slice PR merged"`
   - needs changes → fix → push → go back to step 6
7. NEXT: @references/next-steps.md
