# Debug

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Diagnose first (¬ slice), fix second (converges on standard pipeline).

## Prerequisites
active milestone ∃ — if ∄ milestone:
- Phase 1 (diagnose) proceeds without one (¬ slice needed)
- Phase 2 requires milestone → prompt user to run `/tff:new-milestone` before fixing

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

6. CREATE slice:
   - Create slice via `tff-tools`
   - Create worktree: `tff-tools worktree:create --slice-id <slice-id>` → worktree at `.tff/worktrees/<slice-id>/`
7. CLASSIFY: ask the user → user picks tier (S / F-lite / F-full)
   - Default suggestion based on diagnosis: single-file root cause → S, multi-file → F-lite
8. PLAN: write fix strategy + implicated files ∈ PLAN.md
   - Write to `.tff/milestones/<milestone>/slices/<id>/PLAN.md`
9. HAND OFF to standard pipeline:
   - invoke plan-slice workflow from step 8 (Plannotator Review) onward
   - then: execute-slice → verify-slice → ship-slice (standard workflows)

Debug Phase 2 is an entry point, ¬ a parallel pipeline.
