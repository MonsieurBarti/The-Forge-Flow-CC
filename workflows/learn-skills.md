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
     - compute the content sha: `APPROVED_SHA=$(sha256sum skills/<name>/SKILL.md | cut -d' ' -f1)` (or `shasum -a 256` on macOS)
     - commit the content change (so the working tree is clean and HEAD contains the approved bytes)
     - run `tff-tools skills:approve --id <name> --reason "<refinement summary>" --approved-diff-sha $APPROVED_SHA --refinement-id <draft-id>` to sync `skills/skill-baselines.json` and append to the audit log
     - stage the manifest update and create a separate commit (do NOT amend — global rule prefers new commits over amends)
   - rejected → record as intentional divergence (suppress future suggestions)
7. NEXT: @references/next-steps.md
