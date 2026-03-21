# Complete Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
all slices closed ∧ milestone audit passed

## Steps
1. PR: `gh pr create` milestone/<milestone> → main — **ALWAYS show PR URL**
2. SPAWN tff-security-auditor: milestone-level review
3. REVIEW: `plannotator review`
4. HANDLE: approved → inform ready to merge | changes → fix ∧ re-review
5. AFTER MERGE (user merges via GitHub):
   - close milestone bead, update STATE.md
   - suggest `/tff:new-milestone`

**RULE: tff NEVER merges. Only create PR. User merges via GitHub.**

6. NEXT: @references/next-steps.md
