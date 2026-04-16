---
name: executing-plans
description: "Use when executing approved plans. Wave-based execution with fresh subagent per task."
---

# Executing Plans

## When to Use

∀ execute workflow, after plan approved.

## Execution Model

Fresh subagent per task. Controller curates exactly what context is needed.
¬reuse agent across tasks (context pollution).

## Process

∀ wave ∈ waves (sequential):
  1. Save checkpoint
  2. IF task requires TDD: load @skills/test-driven-development/SKILL.md
     Spawn subagent -> write failing .spec.ts for wave tasks
  3. ∀ task ∈ wave (parallel):
     a. Claim: `claim task in tracker`
     b. Spawn fresh subagent with:
        - Task description from PLAN.md
        - Relevant skill(s) loaded
        - File paths + code snippets from plan
        - ¬full session history (context isolation)
     c. Agent implements -> runs tests -> commits
     d. Save per-task checkpoint update
     e. Close: `close task in tracker`
  4. Sync: `sync state`

## Subagent Dispatch Rules

### When to Spawn
| Condition | Action |
|-----------|--------|
| Wave has >1 task | Spawn parallel agents |
| Task requires specialized skill | Spawn with skill loaded |
| Task touches multiple domains | Spawn single agent with multiple skills |
| Implementation + verification separate | Spawn sequential agents |

### When NOT to Spawn
| Condition | Action |
|-----------|--------|
| Single simple task | Execute directly |
| Sequential dependency chain | Single agent, no parallelism |
| Context already loaded | Continue in same agent |
| Task is documentation only | Execute directly |

## Context Curation

### What to Pass
| Include | Reason |
|---------|--------|
| Task description + ACs | Scope definition |
| Exact file paths | No exploration needed |
| Relevant skills (TDD, architecture, commit-conventions) | Methodology injection |
| Code snippets from plan | Implementation hints |

### What NOT to Pass
| Exclude | Reason |
|---------|--------|
| Prior task context | Context pollution |
| Full SPEC.md (unless needed) | Token overhead |
| Full session history | Noise |
| Unrelated domain knowledge | Distraction |

## Domain Routing

Read task file paths from PLAN.md to decide which domain skills to load:
- File paths ∈ domain/application/infrastructure layers (e.g., `src/domain/`, `src/application/`, `src/infrastructure/`) -> LOAD architecture skills
- File paths ∈ presentation/CLI layers (e.g., `src/cli/`, `src/presentation/`) -> ¬ extra domain skill
- CI/CD files (`.github/`, `Dockerfile`, etc.) -> LOAD commit-conventions only
- All tasks: LOAD executing-plans + commit-conventions as baseline

## Checkpoint Rules

- Save after EACH task (¬just per-wave)
- On failure: resume retries only incomplete tasks ∈ current wave
- On crash: resume from checkpoint, skips completed tasks

## Escalation

- Blocked agent -> create follow-up task + notify user
- Work never silently stalls
- 3+ failed attempts -> escalation task (¬infinite retry)

## Result Aggregation

When subagents complete, aggregate results:

| Result Type | Aggregation Method |
|-------------|-------------------|
| File changes | Git diff per task, merge to wave summary |
| Test results | Collect pass/fail counts, report failures |
| Task status | Mark closed/failed in tracker |
| Artifacts | Collect paths, report to controller |

**Aggregation Rules:**
- ∀ completed task: close in tracker, record commit SHA
- ∀ failed task: log error, retry ≤ 3 times, then escalate
- ∀ wave: produce summary (files changed, tests passed, commits made)
- On wave failure: halt → report → await instruction

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
