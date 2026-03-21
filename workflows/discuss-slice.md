# Workflow: Discuss Slice

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Slice exists and is in `discussing` status

## Steps

### 1. Load slice context
Read the slice bead and any existing notes.

### 2. Classify complexity
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:classify '<signals-json>'
```

### 3. Spawn brainstormer (F-lite and F-full only)
If tier is S, skip brainstorming and auto-transition to researching.

For F-lite/F-full:
- Use the Agent tool to spawn **tff-brainstormer** agent
- Provide: slice description, project context, requirements
- Brainstormer will challenge assumptions, surface unknowns, lock scope

### 4. Spawn product-lead
- Use the Agent tool to spawn **tff-product-lead** agent
- Validate requirements and define acceptance criteria

### 5. Transition to researching
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> researching
```

Auto-continue to research phase or suggest `/tff:research`.

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
