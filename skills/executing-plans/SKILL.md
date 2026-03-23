---
name: executing-plans
description: "Use when executing approved plans. Wave-based execution with fresh subagent per task."
token-budget: critical
---

# Executing Plans

## When to Use

∀ execute workflow, after plan approved.

## Execution Model

Fresh subagent per task. Controller curates exactly what context is needed.
¬reuse agent across tasks (context pollution).

## Process

∀ wave ∈ waves (sequential):
  1. Save checkpoint: `tff-tools checkpoint:save <slice-id>`
  2. IF tier ∈ {F-lite, F-full}: load @skills/test-driven-development.md
     Spawn subagent -> write failing .spec.ts for wave tasks
  3. ∀ task ∈ wave (parallel):
     a. Claim: `bd update <task-id> --claim`
     b. Spawn fresh subagent with:
        - Task description from PLAN.md
        - Relevant skill(s) loaded
        - File paths + code snippets from plan
        - ¬full session history (context isolation)
     c. Agent implements -> runs tests -> commits
     d. Save per-task checkpoint update
     e. Close: `bd close <task-id>`
  4. Sync: `tff-tools sync:state`

## Context Curation

∀ subagent spawn, provide ONLY:
- Task description + acceptance criteria
- Exact file paths from plan
- Relevant skills (TDD, hexagonal-arch, commit-conventions)
- ¬prior task context, ¬full SPEC.md (unless needed)

## Domain Routing

Read task file paths from PLAN.md to decide which domain skills to load:
- File paths in `src/domain/`, `src/application/`, `src/infrastructure/` -> LOAD hexagonal-architecture
- File paths in `src/cli/`, `src/presentation/` -> no extra domain skill
- CI/CD files (`.github/`, `Dockerfile`, etc.) -> LOAD commit-conventions only
- All tasks: LOAD executing-plans + commit-conventions as baseline

## Checkpoint Rules

- Save after EACH task (¬just per-wave)
- On failure: resume retries only incomplete tasks in current wave
- On crash: `/tff:resume` loads checkpoint, skips completed tasks

## Escalation

- Blocked agent -> create follow-up task + notify user
- Work never silently stalls
- 3+ failed attempts -> escalation task (¬infinite retry)

## Anti-Patterns

- Reusing agent context across tasks (pollution)
- Skipping checkpoint saves ("it's fast enough")
- Running all tasks sequentially when wave allows parallelism
- ¬running tests after implementation

## Rules

- ∀ task: fresh subagent (isolated context)
- ∀ commit: follows commit-conventions skill
- ∀ implementation: verified before claiming DONE
- ∀ wave completion: checkpoint saved
