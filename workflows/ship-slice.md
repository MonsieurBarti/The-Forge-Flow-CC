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

## Auto-Transition
Read `.tff/settings.yaml` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: reviewing → completing`

## Auto-Fix (plan-to-pr)
REQUEST_CHANGES ∧ cycles < 2 → SPAWN tff-fixer, re-review
REQUEST_CHANGES ∧ cycles ≥ 2 → escalation task, pause chain
