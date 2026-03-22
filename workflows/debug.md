# Debug

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Diagnose first (no slice), fix second (slice + worktree).

## Prerequisites
active milestone exists — if ∄ milestone:
- Phase 1 (diagnose) proceeds without one (no slice needed)
- Phase 2 requires milestone → prompt user to run `/tff:new-milestone` before fixing

## Phase 1: Diagnose (orchestrator-driven, no slice)

Exception to orchestrator rule 4 ("never load large files in orchestrator"):
like `discuss`, debug drives multi-turn investigation directly. For broad code
exploration, spawn Explore subagents and reason about their findings.

1. GATHER: ask user for error/symptom + reproduction steps via AskUserQuestion
2. LOAD: @skills/debugging-methodology.md
3. CLASSIFY: reproducible error (Track A) or symptom-based (Track B)
4. INVESTIGATE: orchestrator drives systematic diagnosis per skill methodology
   - Track A: parse error → read implicated code → trace call chain → form hypothesis → verify
   - Track B: clarify symptom → reproduce → binary search → instrument → isolate
5. PRESENT: root cause + evidence to user, ask for confirmation via AskUserQuestion
   - If user disagrees → refine hypothesis, loop back to step 4
   - If diagnosis stalls after 3 hypotheses → escalate with findings so far
   - If root cause is external (dependency, system, infra) → exit with diagnostic report,
     suggest workaround options (patch, pin version, upstream issue), do not enter Phase 2

## Phase 2: Fix (slice + worktree, like quick)

6. CREATE slice as S-tier:
   - Create slice bead via `tff-tools`
   - Create worktree: `tff-tools worktree:create <slice-id>` → worktree at `.tff/worktrees/<slice-id>/`
7. PLAN (lightweight): write fix strategy as single task in PLAN.md
   REVIEW: invoke Skill `plannotator-annotate` with arg `.tff/milestones/<milestone>/slices/<id>/PLAN.md`
   feedback → revise ∨ approved → continue
8. SPAWN domain agent (working in `.tff/worktrees/<slice-id>/`) with: root cause description, fix strategy, implicated files
9. VERIFY: spawn tff-product-lead for sanity check
10. SHIP: fresh reviewer enforcement, code-only review (no spec review — no SPEC.md), create slice PR
    **Show PR URL to user**
11. MERGE GATE: AskUserQuestion → "PR merged" or "PR needs changes"
    - merged → `bd close <slice-bead-id> --reason "Slice PR merged"`
    - needs changes → fix → push → go back to step 11
12. NEXT: @references/next-steps.md
