---
name: writing-plans
description: "Use when creating implementation plans. Break specs into bite-sized tasks (2-5 min each)."
token-budget: critical
---

# Writing Plans

## When to Use

∀ plan workflow, after spec approved.

## HARD-GATE

∀ task in plan: must have exact file path, complete code snippet, exact command to run, expected output. "Assumes engineer has zero context and questionable taste."

## Task Granularity

Each task = 1 action (2-5 minutes):
- "Write failing test for X" = 1 task
- "Run test, observe FAIL" = 1 task
- "Implement minimal code to pass" = 1 task
- "Run test, observe PASS" = 1 task
- "Commit with message Y" = 1 task

¬combine multiple actions into one task. ¬"implement feature X" (too broad).

## Plan Structure

```
## Wave 0 (parallel)

### T01: Write failing test for [feature]
- **File**: `src/domain/feature.spec.ts`
- **Code**: [exact test code]
- **Run**: `npx vitest run src/domain/feature.spec.ts`
- **Expect**: FAIL — "feature is not defined"
- **AC**: AC1

### T02: Implement [feature]
- **File**: `src/domain/feature.ts`
- **Code**: [exact implementation]
- **Run**: `npx vitest run src/domain/feature.spec.ts`
- **Expect**: PASS — 1/1 tests passing
- **Commit**: `feat(S01/T02): add feature`

## Wave 1 (depends on Wave 0)
...
```

## Wave Assignment Rules

- Tasks with no dependencies -> Wave 0
- Tasks depending on Wave N -> Wave N+1
- Tasks within same wave -> parallelizable
- Detect via topological sort: `tff-tools waves:detect`

## Review Loop

1. Write plan -> save PLAN.md
2. Anonymous plan reviewer (fresh subagent, max 3 iterations)
3. Plannotator review (user annotates)
4. Approved -> proceed to execute

## Anti-Patterns

- Tasks without exact file paths ("update the relevant files")
- Tasks without expected output ("tests should pass")
- Combining test-writing and implementation in same task
- Plans that skip TDD steps (F-lite/F-full require them)
- Wave assignments that don't match dependency graph

## Rules

- ∀ task: 1 file, 1 action, 1 commit
- ∀ F-lite/F-full task: TDD steps (write test -> fail -> implement -> pass -> commit)
- S-tier: simpler (may combine steps, skip TDD)
- ¬proceed to execute until plan approved
