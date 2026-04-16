# Audit Milestone

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps
1. LOAD: all slice statuses + requirement coverage
2. VERIFY: all slices closed? all requirements covered by ≥1 closed task? deferred items?
3. REPORT:
   ```
   Milestone Audit — [Name]
   Completion: X/Y slices | Requirements: X/Y validated
   Deferred: [list] | Assessment: READY | NOT_READY
   ```
4. ROUTE: READY → suggest `/tff:complete-milestone` | NOT_READY → show gaps + actions
5. NEXT: @references/next-steps.md
