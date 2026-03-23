# Create Skill

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Draft new skill from pattern candidate or user description.

## Steps
1. INPUT: candidate number (load from candidates.jsonl) ∨ free-text description
2. LOAD @skills/skill-authoring.md → SPAWN subagent ("Draft New Skill" mode):
   - provide pattern evidence (or description) + existing skills as format examples
   - draft → `.tff/drafts/<skill-name>.md`
3. VALIDATE: `tff-tools skills:validate '<json>'`
   - fail → drafter fixes ∧ re-validates
4. REVIEW: invoke Skill `plannotator-annotate` with arg `.tff/drafts/<skill-name>.md`
5. HANDLE:
   - approved → move `.tff/drafts/<name>.md` → `skills/<name>.md`
   - feedback → revise ∧ re-invoke `plannotator-annotate`
   - rejected → delete draft
6. NEXT: @references/next-steps.md
