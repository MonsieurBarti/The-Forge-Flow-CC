# Ship Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = reviewing

## Steps
1. `∀ reviewer: tff-tools review:check-fresh <slice-id> <role>`
2. Stage 1 (spec) — SPAWN tff-spec-reviewer: {acceptance_criteria, diff}
   FAIL → SPAWN tff-fixer → re-run | loop until PASS
   Stage 2 blocked until PASS
3. Stage 2 (quality) — SPAWN tff-code-reviewer: {diff, @references/conventions.md}
   REQUEST_CHANGES → SPAWN tff-fixer → loop until APPROVE
4. Stage 3 (security) — SPAWN tff-security-auditor: {diff, @references/security-baseline.md}
   critical ∨ high → blocks PR → SPAWN tff-fixer → re-audit
5. USER REVIEW: `plannotator review`
6. PR: `gh pr create` — `slice/<slice-id>` → `milestone/<milestone>`
   **Show PR URL to user**
7. POST-MERGE (user merges via GitHub):
   delete worktree → close bead → completing → closed

**tff NEVER merges — only creates PR.**

8. NEXT: @references/next-steps.md
