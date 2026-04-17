# Detect Patterns

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Run pattern detection pipeline: extract → aggregate → rank.

## Prerequisites
observation enabled ∈ `.tff/settings.yaml` ∧ `.tff/observations/sessions.jsonl` ∃
LOAD @skills/skill-authoring/SKILL.md

## Settings
Read `.tff/settings.yaml` → `auto-learn.weights`.
Pass to: `tff-tools patterns:rank --weights '<json>'`

## Steps
1. EXTRACT: `tff-tools patterns:extract`
2. AGGREGATE: `tff-tools patterns:aggregate`
3. RANK: `tff-tools patterns:rank`
4. DISPLAY `.tff/observations/candidates.jsonl`: ranked candidates w/ scores + sequences
   - ∅ candidates above threshold → inform user, suggest lower threshold ∨ more observations
5. NEXT: suggest `/tff:suggest-skills` ∨ `/tff:create-skill`
