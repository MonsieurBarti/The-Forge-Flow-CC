# Workflow: Progress

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Steps

### 1. Regenerate STATE.md
```bash
node <plugin-path>/tools/dist/tff-tools.cjs sync:state
```

### 2. Display dashboard
Read `.tff/STATE.md` and present it to the user.

Show:
- Overall milestone progress (slices completed / total)
- Per-slice status with task progress
- Any blocked slices or tasks

### 3. Suggest next action
Based on current state:
- If a slice is in `discussing` → suggest `/tff:discuss`
- If a slice is in `planning` → suggest `/tff:plan`
- If a slice is in `executing` → suggest `/tff:execute`
- If a slice is in `verifying` → suggest `/tff:verify`
- If all slices closed → suggest `/tff:complete-milestone`

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
