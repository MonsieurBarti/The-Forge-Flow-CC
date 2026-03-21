# Workflow: Research Slice

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
