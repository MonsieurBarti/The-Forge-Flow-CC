# Learn (Skill Refinement)

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Detect corrections to existing skills → propose refinements.

## Prerequisites
observation enabled ∧ skills exist ∈ `skills/` ∧ ≥3 corrections observed

## Settings
Read `.tff-cc/settings.yaml` → `auto-learn.guardrails`.
Check cooldown: read `.tff-cc/drafts/metadata.jsonl`, verify canRefine().
Pass maxDrift: `tff-tools skills:drift --max-drift 0.2`

## Steps
1. DRIFT CHECK: ∀ skill, `tff-tools skills:drift --original "<original>" --current "<current>"`
2. COMPARE actual sequences (sessions.jsonl) vs skill's documented steps → flag consistent deviations (≥3 occurrences)
3. divergences found → LOAD @skills/skill-authoring/SKILL.md → SPAWN subagent ("Refine Existing Skill" mode):
   - provide original + divergence evidence → bounded diff (max 20% change)
   - draft → `.tff-cc/drafts/<skill-name>.md`
4. CONSTRAINTS: max 20% per refinement, max 60% cumulative drift, 7-day cooldown
   - violated → warn user, suggest new skill instead
5. REVIEW: invoke Skill `plannotator-annotate` with arg `.tff-cc/drafts/<skill-name>.md`
6. HANDLE:
   - approved →
     - archive to `.tff-cc/observations/skill-history/<name>.v<N>.md`
     - update `skills/<name>.md` with the approved refinement
     - commit the content change (so the working tree is clean for the next step)
     - run `tff-tools skills:approve --id <name> --reason "<refinement summary>"` to sync `skills/skill-baselines.json`
     - stage the manifest update and amend it into the content commit (or create a second commit; the audit-trail requirement is that the reason is captured in a commit message)
   - rejected → record as intentional divergence (suppress future suggestions)
7. NEXT: @references/next-steps.md
