# Complete Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
milestone audit passed

## Steps
1. CLOSE SLICES: `bd list --label tff:slice --json` → for each non-closed slice under this milestone:
   - verify its PR is merged: `gh pr list --state merged --head slice/<slice-id>`
   - if merged → `bd close <id> --reason "Slice PR merged"`
   - if not merged → warn user, block milestone completion
2. PR: `gh pr create` milestone/<milestone> → main — **ALWAYS show PR URL**
3. SPAWN tff-security-auditor: milestone-level review
4. REVIEW: invoke Skill `plannotator-review` for interactive milestone review
5. HANDLE: approved → inform ready to merge | changes → fix ∧ re-review

**tff NEVER merges — only creates PR.**

6. MERGE GATE: AskUserQuestion → "PR merged" or "PR needs changes"
   - merged → continue to step 7
   - needs changes → fix → push → go back to step 6
7. CLOSE MILESTONE:
   - `bd close <milestone-bead-id> --reason "Milestone merged to main"`
   - update STATE.md: `tff-tools sync:state`
   - suggest `/tff:new-milestone`
8. NEXT: @references/next-steps.md
