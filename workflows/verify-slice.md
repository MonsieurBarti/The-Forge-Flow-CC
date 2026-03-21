# Verify Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = verifying

## Steps
1. SPAWN tff-product-lead: {acceptance_criteria from PLAN.md}
   - Verify each criterion against implementation
2. FINDINGS → `plannotator annotate .tff/slices/<slice-id>/VERIFICATION.md`
3. VERDICT:
   - PASS → `tff-tools slice:transition <id> reviewing` → suggest `/tff:ship`
   - FAIL → ask user: fix (→ back to executing, replan) ∨ accept w/ exceptions (→ reviewing)
4. NEXT: @references/next-steps.md
