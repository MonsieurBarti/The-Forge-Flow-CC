# Ship Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = reviewing
LOAD @skills/verification-before-completion/SKILL.md
LOAD @skills/finishing-work/SKILL.md

## Steps
1. `∀ reviewer: tff-tools review:check-fresh --slice-id <slice-id> --agent <role>`
2. Stage 1 (spec) — SPAWN tff-spec-reviewer: {acceptance_criteria, diff}
   FAIL → SPAWN tff-fixer → re-run | loop until PASS
   Stage 2 blocked until PASS
3. Stage 2 (quality) — SPAWN tff-code-reviewer: {diff, @references/conventions.md}
   REQUEST_CHANGES → SPAWN tff-fixer → loop until APPROVE
4. Stage 3 (security) — SPAWN tff-security-auditor: {diff, @references/security-baseline.md}
   critical ∨ high → blocks PR → SPAWN tff-fixer → re-audit
5. PR: `gh pr create` — `slice/<slice-id>` → `milestone/<milestone>`
   **Show PR URL to user**

**tff NEVER merges — only creates PR.**

6. MERGE GATE: ask user with options:
   - **"PR merged"** → continue to step 7
   - **"PR needs changes"** → SPAWN tff-fixer with requested changes → push fixes → go back to step 6
7. CLOSE + CLEANUP:
   - `tff-tools worktree:delete --slice-id <slice-id>` (if worktree ∃)
   - `tff-tools slice:close --slice-id <slice-id> --reason "Slice PR merged"`
   - `git push origin --delete slice/<slice-id>` (delete remote slice branch)
   - `git branch -d slice/<slice-id>` (delete local slice branch, if ∃)
   - `git fetch origin milestone/<milestone> && git rebase origin/milestone/<milestone>` (keep milestone branch up to date)
   - Log: `[tff] <slice-id>: reviewing → closed`
8. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask user
   - Human gates (plan approval, spec approval, merge gate): pause ∧ ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user

## Auto-Fix (plan-to-pr)
REQUEST_CHANGES ∧ cycles < 2 → SPAWN tff-fixer, re-review, go back to merge gate
REQUEST_CHANGES ∧ cycles ≥ 2 → escalation task, pause chain
