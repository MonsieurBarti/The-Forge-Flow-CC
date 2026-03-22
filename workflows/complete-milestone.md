# Complete Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
all slices closed ∧ milestone audit passed

## Steps
1. PR: `gh pr create` milestone/<milestone> → main — **ALWAYS show PR URL**
2. SPAWN tff-security-auditor: milestone-level review
3. REVIEW: invoke Skill `plannotator-review` for interactive milestone review
4. HANDLE: approved → inform ready to merge | changes → fix ∧ re-review
5. AFTER MERGE (user merges via GitHub):
   - close all open slice beads: `bd list --label tff:slice --json` → for each open/non-closed slice under this milestone: `bd close <id> --reason "Milestone completed"`
   - close milestone bead: `bd close <milestone-bead-id> --reason "Milestone merged to main"`
   - update STATE.md: `tff-tools sync:state`
   - suggest `/tff:new-milestone`

**RULE: tff NEVER merges. Only create PR. User merges via GitHub.**

6. NEXT: @references/next-steps.md
