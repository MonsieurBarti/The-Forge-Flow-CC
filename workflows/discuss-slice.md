# Discuss Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = discussing

## Steps
1. CHECK: read slice bead + notes
2. CLASSIFY: `tff-tools slice:classify '<signals>'`
3. tier = S → auto-transition researching, skip brainstorm
4. SPAWN tff-brainstormer: {slice_desc, project_context, requirements}
   - Challenge assumptions, surface unknowns, lock scope
5. SPAWN tff-product-lead: {requirements, acceptance_criteria}
   - Validate requirements, define acceptance criteria
6. TRANSITION: `tff-tools slice:transition <id> researching`
7. NEXT: @references/next-steps.md

## Auto-Transition
Read `.tff/settings.yaml` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: discussing → researching`
