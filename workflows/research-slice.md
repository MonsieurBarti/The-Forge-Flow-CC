# Workflow: Research Slice

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Slice is in `researching` status

## Steps

### 1. Determine research needs
- F-full: research is required — spawn researcher
- F-lite: research is optional — ask user
- S: skip research entirely

### 2. Conduct research (if needed)
Research the technical approach:
- Read relevant codebase areas
- Check dependencies and integration points
- Document findings in `.tff/slices/<slice-id>/RESEARCH.md`

### 3. Transition to planning
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> planning
```

Auto-continue to plan phase or suggest `/tff:plan`.

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
