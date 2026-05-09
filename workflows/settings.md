# Settings

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

View ∧ modify all project settings.

## Prerequisites
tff project ∃

## Steps
1. READ `.tff-cc/settings.yaml` (if ∃)
   - If missing → offer to create from @references/settings-template.md
2. DETECT missing fields: compare against template, list any absent sections
   - If missing fields found → offer to add them with defaults (preserve existing values + comments)
3. DISPLAY all settings grouped by section:
   - Model Profiles: quality/balanced/budget with current models
   - Autonomy: current mode with explanation of alternatives
   - Workflow: reminders, guards
   - Routing: enabled, confidence_threshold, tier_policy, logging.path,
     calibration (n_min, debug_join, model_judge), pools (if any)
4. ASK: which section to modify? (∨ "done" to exit)
5. ACCEPT changes per section:
   - Model profiles: quality/balanced/budget model selection
   - Autonomy: mode selection with explanation of guided vs plan-to-pr
   - Workflow: toggle reminders/guards
   - Routing: enable/disable, tier policy, calibration toggles, model_judge enable
6. WRITE updated `.tff-cc/settings.yaml` (preserve comments where possible)
7. NEXT: @references/next-steps.md
