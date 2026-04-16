# Verify Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = verifying
LOAD @skills/verification-before-completion/SKILL.md

## Steps
1. LOAD @skills/acceptance-criteria-validation/SKILL.md → SPAWN subagent: {acceptance_criteria from PLAN.md}
   - Verify each criterion against implementation
2. FINDINGS → invoke Skill `plannotator-annotate` with arg `.tff/milestones/<milestone>/slices/<slice-id>/VERIFICATION.md`
3. VERDICT:
   - PASS → `tff-tools slice:transition --slice-id <id> --status reviewing`
     CHECK: `ok` = true → suggest `/tff:ship` | `ok` = false → warn user, offer retry ∨ abort
   - FAIL → ask user: fix (→ back to executing, replan) ∨ accept w/ exceptions (→ reviewing)
4. NEXT: @references/next-steps.md

## Auto-Transition
Read `.tff/settings.yaml` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next --status <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: verifying → reviewing`

## Retry (plan-to-pr)
FAIL ∧ attempts < 2 → `git revert`, reload checkpoint, re-execute from failed wave
FAIL ∧ attempts ≥ 2 → `tff-tools` escalation task, pause chain
