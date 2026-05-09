# Debug

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Diagnose first (¬ slice), fix second (converges on standard pipeline).

## Prerequisites
git repo ∃

## Phase 1: Diagnose (orchestrator-driven, ¬ slice)

Exception to orchestrator rule 4 ("never load large files ∈ orchestrator"):
like `discuss`, debug drives multi-turn investigation directly. For broad code
exploration, spawn Explore subagents ∧ reason about their findings.

1. GATHER: ask user for error/symptom + reproduction steps inline
2. LOAD: @skills/systematic-debugging/SKILL.md
3. CLASSIFY: reproducible error (Track A) ∨ symptom-based (Track B)
4. INVESTIGATE: orchestrator drives systematic diagnosis per skill methodology
   - Track A: parse error → read implicated code → trace call chain → form hypothesis → verify
   - Track B: clarify symptom → reproduce → binary search → instrument → isolate
5. PRESENT: root cause + evidence to user, ask for confirmation inline
   - If user disagrees → refine hypothesis, loop back to step 4
   - If diagnosis stalls after 3 hypotheses → escalate with findings so far
   - If root cause is external (dependency, system, infra) → exit with diagnostic report,
     suggest workaround options (patch, pin version, upstream issue), do ¬ enter Phase 2

## Phase 2: Fix (converges on standard pipeline)

6. CREATE ad-hoc debug slice:
   - DETECT base branch from current HEAD: `git rev-parse --abbrev-ref HEAD` → <base-branch>
   - PROMPT user inline for branch name with default `fix/<slugified-title-from-diagnosis>`
     (orchestrator drives prompt; tff-tools does ¬ prompt)
   - CREATE slice: `tff-tools slice:create --kind debug --base-branch <base-branch> --branch <name> --title <title>`
     → response includes slice_id
   - CREATE worktree: `tff-tools worktree:create --slice-id <slice-id>` → `.tff-cc/worktrees/D-##/`
7. CLASSIFY: ask user → user picks tier (S / SS / SSS)
   - Default suggestion based on diagnosis: single-file root cause → S, multi-file → SS
8. PLAN: write fix strategy + implicated files ∈ PLAN.md
   - Write to `.tff-cc/debug/<D-label>/PLAN.md`
9. HAND OFF to standard pipeline:
   - invoke plan-slice workflow from step 8 (Plannotator Review) onward
   - **step 8 is a REQUIRED gate** per `skills/plannotator-usage/SKILL.md` — do NOT skip,
     even for S-tier debug fixes; if plannotator is unavailable, surface to user ∧ pause
   - then: execute-slice → verify-slice → ship-slice (standard workflows)

Debug Phase 2 is an entry point, ¬ a parallel pipeline. Always standalone (kind=debug).
