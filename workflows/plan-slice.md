# Plan Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites
status = planning
SPEC.md exists at `.tff/slices/<id>/SPEC.md`

## Steps

### 1. Load Spec
READ `.tff/slices/<id>/SPEC.md`
READ `.tff/slices/<id>/RESEARCH.md` (if exists)

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
WRITE `.tff/slices/<id>/PLAN.md`:

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
invoke Skill `plannotator-annotate` with arg `.tff/slices/<id>/PLAN.md`
feedback → revise ∨ approved → continue

### 9. Worktree + Transition
`tff-tools worktree:create <id>`
`tff-tools slice:transition <id> executing`

## Auto-Transition
`plan-to-pr` → auto-invoke execute | `guided` → suggest `/tff:execute`
`[tff] <slice-id>: planning → executing`
