# Workflow: Plan Slice

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Slice is in `planning` status

## Steps

### 1. Create task decomposition
Based on research and discussion:
- Break the slice into tasks with clear acceptance criteria
- Define task dependencies (which tasks block others)
- Each task should be atomic (one commit)

### 2. Write PLAN.md
Create `.tff/slices/<slice-id>/PLAN.md` with:
- Slice goal
- Task list with descriptions, acceptance criteria, and dependencies
- Estimated complexity tier

### 3. Create task beads
For each task, create a `tff:task` bead with dependencies.

### 4. Detect waves
```bash
node <plugin-path>/tools/dist/tff-tools.cjs waves:detect '<tasks-json>'
```
Show the user the wave decomposition.

### 5. Spawn architect (F-lite and F-full)
Use the Agent tool to spawn **tff-architect** agent to validate the plan structure.

### 6. Plan review via plannotator
```bash
plannotator annotate .tff/slices/<slice-id>/PLAN.md
```
User reviews and annotates the plan. Loop until approved:
- If feedback → revise plan → re-submit to plannotator
- If approved → transition to executing

### 7. Create worktree
```bash
node <plugin-path>/tools/dist/tff-tools.cjs worktree:create <slice-id>
```

### 8. Transition to executing
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> executing
```

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
