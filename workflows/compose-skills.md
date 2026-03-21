# Workflow: Compose (Skill Clusters)

Detect skill co-activation clusters and propose bundles or agents.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- Observation is enabled
- Multiple skills exist in `skills/`

## Steps

### 1. Detect clusters

```bash
node <plugin-path>/tools/dist/tff-tools.cjs compose:detect '<co-activations-json>' <total-sessions>
```

### 2. Show clusters

Display detected clusters to user:
```
Skill clusters (70%+ co-activation):

1. [85%] hexagonal-architecture + commit-conventions + tdd
   Co-activated in 17/20 sessions
   Suggestion: backend-workflow bundle

2. [90%] code-review-checklist + hexagonal-architecture
   Co-activated in 18/20 sessions
   Suggestion: review-workflow bundle
```

### 3. Spawn skill drafter

For selected cluster, spawn **tff-skill-drafter** agent in "Compose Bundle" mode:
- Provide cluster skills and co-activation rate
- Agent decides bundle vs agent and drafts accordingly
- Draft saved to `.tff/drafts/<name>.md`

### 4. Review via plannotator

```bash
plannotator annotate .tff/drafts/<name>.md
```

### 5. Handle outcome

- **Approved bundle**: move to `skills/<name>.md`
- **Approved agent**: move to `agents/<name>.md`
- **Rejected**: record, don't suggest again

### Next Step

Based on the current state, suggest the appropriate next command from @references/next-steps.md.
