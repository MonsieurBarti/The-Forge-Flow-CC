# Learn (Skill Refinement)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Detect corrections to existing skills → propose refinements.

## Prerequisites
observation enabled ∧ skills exist in `skills/` ∧ ≥3 corrections observed

## Settings
Read `.tff/settings.yaml` → `auto-learn.guardrails`.
Check cooldown: read `.tff/drafts/metadata.jsonl`, verify canRefine().
Pass maxDrift: `tff-tools skills:drift --max-drift 0.2`

## Steps
1. DRIFT CHECK: for each skill, `tff-tools skills:drift "<original>" "<current>"`
2. COMPARE actual sequences (sessions.jsonl) vs skill's documented steps → flag consistent deviations (≥3 occurrences)
3. divergences found → SPAWN tff-skill-drafter ("Refine Existing Skill" mode):
   - provide original + divergence evidence → bounded diff (max 20% change)
   - draft → `.tff/drafts/<skill-name>.md`
4. CONSTRAINTS: max 20% per refinement, max 60% cumulative drift, 7-day cooldown
   - violated → warn user, suggest new skill instead
5. REVIEW: `plannotator annotate .tff/drafts/<skill-name>.md`
6. HANDLE:
   - approved → archive to `.tff/observations/skill-history/<name>.v<N>.md`, update `skills/<name>.md`
   - rejected → record as intentional divergence (suppress future suggestions)
7. NEXT: @references/next-steps.md
