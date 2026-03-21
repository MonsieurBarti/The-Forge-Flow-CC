# Workflow: Detect Patterns

Run the pattern detection pipeline: extract n-grams, aggregate, rank.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- Observation is enabled in `.tff/settings.yaml`
- `.tff/observations/sessions.jsonl` exists with data

## Steps

### 1. Extract n-grams

```bash
node <plugin-path>/tools/dist/tff-tools.cjs patterns:extract
```

### 2. Aggregate patterns

```bash
node <plugin-path>/tools/dist/tff-tools.cjs patterns:aggregate
```

### 3. Rank candidates

```bash
node <plugin-path>/tools/dist/tff-tools.cjs patterns:rank
```

### 4. Show results

Read `.tff/observations/candidates.jsonl` and display ranked candidates to the user with scores and pattern sequences.

If no candidates found above threshold, inform user and suggest lowering threshold or collecting more observations.

### Next Step

Suggest `/tff:suggest-skills` to see candidates with human-readable summaries, or `/tff:create-skill` to create a skill from a specific candidate.
