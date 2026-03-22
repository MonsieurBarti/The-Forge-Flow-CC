# Research Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = researching

## Steps
1. ROUTE: F-full → spawn researcher | F-lite → ask user | S → skip
2. RESEARCH (if needed):
   - Read relevant codebase areas
   - Check dependencies + integration points
   - Output → `.tff/milestones/<milestone>/slices/<slice-id>/RESEARCH.md`
3. TRANSITION: `tff-tools slice:transition <id> planning`
4. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, completion): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: researching → planning`
