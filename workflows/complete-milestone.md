# Complete Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
- milestone audit passed (recorded via `tff-tools milestone:record-audit --verdict ready`)

## Steps
0. AUDIT GATE:
   - The orchestrator MUST confirm an audit with verdict `ready` exists for this milestone. If no audit has been recorded, OR the latest verdict is `not_ready`:
     > Milestone not audited (or audit did not pass). Run `/tff:audit-milestone` first.
   - In that case, abort this workflow — do NOT proceed to step 1.
   - Implementation note: callers using `tff-tools` should prefer invoking `milestone:get` + reading the latest audit row, or build a thin wrapper around `checkAuditPassed` (`src/application/milestone/check-audit-passed.ts`). A dedicated `milestone:audit-status` CLI command is out of scope for this quickfix bundle.
1. CLOSE SLICES: `tff-tools slice:list` → filter for non-closed slices under this milestone:
   - verify its PR is merged: `gh pr list --state merged --head slice/<slice-id>`
   - if merged → `tff-tools slice:close --slice-id <id> --reason "Slice PR merged"`
   - if ¬ merged → warn user, block milestone completion
2. PR: `gh pr create` milestone/<milestone> → main — **ALWAYS show PR URL**
3. SPAWN tff-security-auditor: milestone-level review
4. HANDLE: approved → inform ready to merge | changes → fix ∧ re-review

**tff NEVER merges — only creates PR.**

5. MERGE GATE: ask user inline → "PR merged" ∨ "PR needs changes"
   - merged → continue to step 6
   - needs changes → fix → push → go back to step 5
6. CLOSE MILESTONE + CLEANUP:
   - `tff-tools milestone:close --milestone-id <id> --reason "Milestone merged to main"`
   - update STATE.md: `tff-tools sync:state --milestone-id <milestone-id>`
   - delete stale slice branches: `∀ slice branch → git push origin --delete slice/<id>`
   - delete milestone branch: `git push origin --delete milestone/<milestone>`
   - delete local branches: `git branch -d milestone/<milestone>`
   - suggest `/tff:new-milestone`
7. NEXT: @references/next-steps.md
