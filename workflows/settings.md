# Settings

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

View and modify all project settings.

## Prerequisites
tff project exists

## Steps
1. READ `.tff/settings.yaml` (if exists)
   - If missing → offer to create from @references/settings-template.md
2. DETECT missing fields: compare against template, list any absent sections
   - If missing fields found → offer to add them with defaults (preserve existing values + comments)
3. DISPLAY all settings grouped by section:
   - Model Profiles: quality/balanced/budget with current models
   - Autonomy: current mode with explanation of alternatives
   - Auto-Learn: weights, guardrails, clustering thresholds
     - Note: "these fields are forward-looking — modifying them has no runtime effect yet"
4. ASK: which section to modify? (or "done" to exit)
5. ACCEPT changes per section:
   - Model profiles: quality/balanced/budget model selection
   - Autonomy: mode selection with explanation of guided vs plan-to-pr
   - Auto-learn: weights, guardrails, clustering values
6. WRITE updated `.tff/settings.yaml` (preserve comments where possible)
7. NEXT: @references/next-steps.md
