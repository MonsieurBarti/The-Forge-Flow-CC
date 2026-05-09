# Verify Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = verifying
LOAD @skills/verification-before-completion/SKILL.md

## Steps
1. LOAD @skills/acceptance-criteria-validation/SKILL.md → SPAWN subagent: {acceptance_criteria from PLAN.md}
   - Verify each criterion against implementation
2. Plannotator Review (REQUIRED gate)
   **REQUIRED — do NOT proceed past this step until annotations are resolved.**
   This is a hard dependency per `skills/plannotator-usage/SKILL.md` (no terminal fallback).

   FINDINGS → invoke Skill `plannotator-annotate` with arg `.tff-cc/milestones/<milestone>/slices/<slice-id>/VERIFICATION.md`
   - feedback → revise the artifact, re-invoke
   - approved (no annotations ∨ all resolved) → continue
   - skipping this step is ¬ allowed; if plannotator is unavailable, surface to user ∧ pause
3. VERDICT:
   - PASS → `tff-tools slice:transition --slice-id <id> --status reviewing`
     CHECK: `ok` = true → suggest `/tff:ship` | `ok` = false → warn user, offer retry ∨ abort
   - FAIL → ask user: fix (→ back to executing, replan) ∨ accept w/ exceptions (→ reviewing)
4. NEXT: @references/next-steps.md

## Auto-Transition
Read `.tff-cc/settings.yaml` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next --status <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: verifying → reviewing`

## Retry (plan-to-pr)
FAIL ∧ attempts < 2 → `git revert`, reload checkpoint, re-execute from failed wave
FAIL ∧ attempts ≥ 2 → `tff-tools` escalation task, pause chain
