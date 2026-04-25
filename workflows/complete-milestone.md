# Complete Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
- milestone audit passed (recorded via `tff-tools milestone:record-audit --verdict ready`)

## Steps
0. AUDIT GATE:
   - Run `tff-tools milestone:audit-status --milestone-id <id>` to confirm a passing audit.
     - On `{"ok": true, "data": {"verdict": "ready"}}` → proceed to step 1.
     - On `{"ok": false, "error": {"code": "AUDIT_REQUIRED"}}` → tell the user:
       > Milestone not audited. Run `/tff:audit-milestone` first.
       Abort this workflow.
     - On `{"ok": false, "error": {"code": "AUDIT_NOT_READY"}}` → tell the user:
       > Last audit verdict was `not_ready`. Re-run `/tff:audit-milestone` to produce a passing verdict.
       Abort this workflow.
1. CLOSE SLICES: `tff-tools slice:list` → filter for non-closed slices under this milestone:
   - verify its PR is merged: `gh pr list --state merged --head slice/<slice-id>`
   - if merged → `tff-tools slice:close --slice-id <id> --reason "Slice PR merged"`
     then DRAIN routing judgment for that slice (same dance as ship-slice.md step 7):
     a. `tff-tools routing:judge-prepare --slice <id>` → parse JSON
     b. IF `data.evidence == null` → `tff-tools judge:pending:clear --slice-id <id>` ∧ skip c–d
     c. ELSE: write evidence to temp file, SPAWN tff-outcome-judge with evidence + verdicts paths, await
     d. `tff-tools routing:judge-record --slice <id> --verdicts-path <verdicts-path>`
     - any error → surface, leave pending row, abort milestone close (user drains later via `/tff:judge`)
   - if ¬ merged → warn user, block milestone completion
1a. PRE-CLOSE GATE: `tff-tools judge:pending:list --milestone-id <id>` must return `count: 0`.
    If non-zero, drain each via `/tff:judge --slice-id <slice-id>` before continuing — `milestone:close` will refuse otherwise (`PENDING_JUDGMENTS`).
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
