# Plan Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

**Autonomy**: check `.tff/settings.yaml` → `autonomy.mode` before pausing.

## Prerequisites
status = planning
SPEC.md exists at `.tff/milestones/<milestone>/slices/<id>/SPEC.md`

## Steps

### 1. Load Spec
READ `.tff/milestones/<milestone>/slices/<id>/SPEC.md`
READ `.tff/milestones/<milestone>/slices/<id>/RESEARCH.md` (if exists)

### 2. File Structure
Map files to create/modify BEFORE tasks.
∀ file: one responsibility, follow existing codebase patterns.
Present file map to user.

### 3. Task Decomposition
DECOMPOSE spec → tasks:
- 1 task = 1 logical unit (may be multiple commits)
- ∀ task: description, files (create/modify/test), acceptance criteria refs (AC1, AC2...), deps
- TDD steps ∀ task:
  1. Write failing test (exact code)
  2. Run test (exact command + expected FAIL)
  3. Write implementation (exact code)
  4. Run test (exact command + expected PASS)
  5. Commit (exact git command)
- Exact file paths, not "add to the service"
- Code snippets, not "implement validation"

### 4. Write PLAN.md
WRITE `.tff/milestones/<milestone>/slices/<id>/PLAN.md`:

```
# [Slice] Implementation Plan

> For agentic workers: execute task-by-task with TDD.

**Goal:** [from SPEC.md]
**Architecture:** [from SPEC.md]
**Tech Stack:** [relevant to slice]

## File Structure
[files to create/modify with responsibilities]

---

### Task N: [Component]
**Files:** Create/Modify/Test with exact paths
**Traces to:** AC1, AC3

- [ ] Step 1: Write failing test [exact code]
- [ ] Step 2: Run [exact command], verify FAIL
- [ ] Step 3: Implement [exact code]
- [ ] Step 4: Run [exact command], verify PASS
- [ ] Step 5: Commit [exact git command]
```

### 5. Create Task Beads + Detect Waves
CREATE beads: `tff-tools` ∀ task w/ deps
DETECT: `tff-tools waves:detect '<tasks-json>'` → show user

### 6. Architecture Review (F-lite ∧ F-full)
SPAWN tff-architect: {plan_content, spec_content}
Issues → revise plan

### 7. Plan Review
DISPATCH anonymous reviewer via Agent tool (prompt: @skills/interactive-design.md § Plan Document Reviewer)
Issues → fix, re-dispatch (max 3)

### 8. Plannotator Review
invoke Skill `plannotator-annotate` with arg `.tff/milestones/<milestone>/slices/<id>/PLAN.md`
feedback → revise ∨ approved → continue

### 9. Worktree + Transition
`tff-tools worktree:create <id>`
CHECK: `ok` = true → continue | `ok` = false → warn (worktree failure is non-blocking at plan time; execute-slice will block F-lite/F-full if worktree is still missing)
`tff-tools slice:transition <id> executing`
CHECK: `ok` = true → continue | `ok` = false → warn user, offer retry or abort
  IF `ok` = true ∧ `warnings.length > 0`:
    ∀ warning ∈ warnings: display `⚠ <warning>` to user

## Auto-Transition
After completing all steps above:
1. READ `.tff/settings.yaml` → check `autonomy.mode`
2. IF `plan-to-pr`:
   - Non-gate steps: IMMEDIATELY invoke the next workflow — do NOT ask the user
   - Human gates (plan approval, spec approval, completion): pause and ask
3. IF `guided`: suggest next step with `/tff:<command>`, wait for user
4. Log: `[tff] <slice-id>: planning → executing`
