# Ship Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

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
5. PR: `gh pr create` — `slice/<slice-id>` → `milestone/<milestone>`
   **Show PR URL to user**

**tff NEVER merges — only creates PR.**

6. MERGE GATE: AskUserQuestion with options:
   - **"PR merged"** → continue to step 7
   - **"PR needs changes"** → SPAWN tff-fixer with requested changes → push fixes → go back to step 6
7. CLOSE:
   - `tff-tools worktree:delete <slice-id>` (if worktree exists)
   - `bd close <slice-bead-id> --reason "Slice PR merged"`
   - Log: `[tff] <slice-id>: reviewing → closed`
8. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, merge gate): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user

## Auto-Fix (plan-to-pr)
REQUEST_CHANGES ∧ cycles < 2 → SPAWN tff-fixer, re-review, go back to merge gate
REQUEST_CHANGES ∧ cycles ≥ 2 → escalation task, pause chain
