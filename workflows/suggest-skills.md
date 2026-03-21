# Workflow: Suggest Skills

Show ranked pattern candidates with human-readable summaries.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- `/tff:detect-patterns` has been run (candidates.jsonl exists)

## Steps

### 1. Load candidates

Read `.tff/observations/candidates.jsonl`.

If no candidates exist, suggest running `/tff:detect-patterns` first.

### 2. Generate summaries

For each candidate, spawn **tff-skill-drafter** agent in summarize mode:
- Provide the pattern sequence and evidence
- Agent returns a one-line summary

### 3. Display to user

Show numbered list:
```
Detected patterns:

1. [0.78] Read -> Grep -> Edit -> Bash(npm test)
   12 occurrences, 8 sessions, 3 projects
   Looks like: TDD workflow — find code, edit, run tests

2. [0.65] Bash(git add) -> Bash(git commit)
   25 occurrences, 15 sessions, 5 projects
   Looks like: atomic commit workflow

Create a skill from any of these? (number/skip)
```

### Next Step

If user selects a candidate, suggest `/tff:create-skill <number>`.
