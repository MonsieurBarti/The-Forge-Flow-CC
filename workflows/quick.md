# Quick (Entry-Point Shortcut)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Skips discuss + research. Always standalone (¬ attached to active milestone, even if one ∃).
Creates ad-hoc slice + worktree from current branch, writes lightweight plan, hands off
to standard pipeline.

## Prerequisites
git repo ∃

## Steps
1. CREATE ad-hoc quick slice:
   - DETECT base branch: `git rev-parse --abbrev-ref HEAD` → <base-branch>
   - PROMPT user inline for branch name with default `feat/<slugified-title>`
     (orchestrator drives prompt; tff-tools does ¬ prompt)
   - CREATE slice via `tff-tools slice:create --kind quick --base-branch <base-branch> --branch <name> --title <title>`
     → response includes slice_id
   - CREATE worktree: `tff-tools worktree:create --slice-id <slice-id>`
     → worktree at `.tff-cc/worktrees/Q-##/`
2. CLASSIFY: ask user → user picks tier (S / SS / SSS)
   - Default suggestion: S (single-file fix) ∨ SS
3. PLAN (lightweight): ask user for 1-2 sentence desc → single task ∈ PLAN.md
   - Write to `.tff-cc/quick/<Q-label>/PLAN.md`
4. HAND OFF to standard pipeline:
   - invoke plan-slice workflow from step 8 (Plannotator Review) onward
   - **step 8 is a REQUIRED gate** per `skills/plannotator-usage/SKILL.md` — do NOT skip,
     even for S-tier quick fixes; if plannotator is unavailable, surface to user ∧ pause
   - then: execute-slice → verify-slice → ship-slice (standard workflows)

Quick is an entry point, ¬ a parallel pipeline. Always standalone (kind=quick).
