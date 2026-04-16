# Execute Slice
LOAD @skills/executing-plans/SKILL.md
LOAD @skills/verification-before-completion/SKILL.md

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = executing ∧ worktree ∃ at `.tff/worktrees/<slice-id>/`

## Pre-Execute Validation
1. READ slice classification from SPEC.md → tier ∈ {S-tier, F-lite, F-full}
2. IF tier ∈ {F-lite, F-full}:
   - CHECK: `tff-tools worktree:list` → verify worktree ∃ for `<slice-id>`
   - IF worktree MISSING:
     ❌ BLOCKED: Worktree required for F-lite/F-full execution but ¬ found.
     Recovery: `tff-tools worktree:create --slice-id <slice-id>`
     → STOP execution. Do NOT proceed.
3. IF tier = S-tier:
   - Worktree ¬ required. Proceed ∈ main repo.

## Steps
1. RESUME: `tff-tools checkpoint:load --slice-id <slice-id>` →
   - Skip fully completed waves (wave ∈ completedWaves)
   - For current wave: skip tasks already ∈ completedTasks, retry remaining
2. DETECT: `tff-tools waves:detect --tasks '<tasks-json>'`
3. EXECUTE:
```
∀ wave ∈ waves (sequential):
  STALE-CHECK: `tff-tools claim:check-stale` → if count > 0: warn user, list stale tasks, offer to continue or abort
  tff-tools checkpoint:save --slice-id <slice-id> --base-commit <sha> --current-wave <wave> --completed-waves '<json-array>' --completed-tasks '<json-array>' --executor-log '<json-array>'
  tier ∈ {F-lite, F-full} → LOAD @skills/test-driven-development/SKILL.md → SPAWN subagent: {task.criteria, task.files}
    tester writes failing .spec.ts + commits in worktree
  ∀ task ∈ wave (parallel):
    IF task.ref ∈ checkpoint.completedTasks → SKIP
    tff-tools task:claim --task-id <id>
    LOAD @skills/executing-plans/SKILL.md + domain skills (see routing below) → SPAWN subagent: {task.description, task.criteria, task.files, @references/conventions.md}
    agent works in worktree → implement → tests pass → commit
    tff-tools task:close --task-id <id> --reason "Completed"
    tff-tools checkpoint:save --slice-id <slice-id> '<updated-data-json>'   ← per-task checkpoint
  sync:state
```
## Domain Routing
Read task file paths from PLAN.md to decide which domain skills to load:
- File paths ∈ `src/domain/`, `src/application/`, `src/infrastructure/` → LOAD @skills/hexagonal-architecture/SKILL.md
- File paths ∈ `src/cli/`, `src/presentation/` → ¬ extra domain skill
- CI/CD files (`.github/`, `Dockerfile`, etc.) → LOAD @skills/commit-conventions/SKILL.md only
- All tasks: LOAD @skills/executing-plans/SKILL.md + @skills/commit-conventions/SKILL.md as baseline

4. TRANSITION: `tff-tools slice:transition --slice-id --status <id> verifying`
   CHECK: `ok` = true → continue | `ok` = false → warn user, offer retry ∨ abort
  IF `ok` = true ∧ `warnings.length > 0`:
    ∀ warning ∈ warnings: display `⚠ <warning>` to user
5. NEXT: @references/next-steps.md

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask user
   - Human gates (plan approval, spec approval, completion): pause ∧ ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: executing → verifying`
