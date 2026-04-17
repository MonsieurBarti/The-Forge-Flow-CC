# Research Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff-cc/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = researching
LOAD @skills/architecture-review/SKILL.md

## Steps
1. ROUTE: F-full → spawn researcher | F-lite → ask user | S → skip
2. RESEARCH (if needed):
   - Read relevant codebase areas
   - Check dependencies + integration points
   - Output → `.tff-cc/milestones/<milestone>/slices/<slice-id>/RESEARCH.md`
3. TRANSITION: `tff-tools slice:transition --slice-id <id> --status planning`
   CHECK: `ok` = true → continue | `ok` = false → warn user, offer retry ∨ abort
  IF `ok` = true ∧ `warnings.length > 0`:
    ∀ warning ∈ warnings: display `⚠ <warning>` to user
4. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff-cc/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask user
   - Human gates (plan approval, spec approval, completion): pause ∧ ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: researching → planning`
