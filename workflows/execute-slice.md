# Execute Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = executing ∧ worktree exists at `.tff/worktrees/<slice-id>/`

## Steps
1. RESUME: `tff-tools checkpoint:load <slice-id>` → skip completed waves
2. DETECT: `tff-tools waves:detect '<tasks-json>'`
3. EXECUTE:
```
∀ wave ∈ waves (sequential):
  checkpoint:save <slice-id> '<data-json>'
  tier ∈ {F-lite, F-full} → ∀ task: SPAWN tff-tester: {task.criteria, task.files}
    tester writes failing .spec.ts + commits in worktree
  ∀ task ∈ wave (parallel):
    bd update <id> --claim
    SPAWN executor_agent: {task.description, task.criteria, task.files, @references/conventions.md}
    agent works in worktree → implement → tests pass → commit
    record executor → bead metadata
    bd close <id> --reason "Completed"
  sync:state
```
4. TRANSITION: `tff-tools slice:transition <id> verifying`
5. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, completion): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: executing → verifying`
