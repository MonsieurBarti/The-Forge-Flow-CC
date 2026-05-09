---
name: tff:debug
description: Diagnose and fix a bug with systematic debugging — diagnosis first, then fix via slice
argument-hint: "<error description or symptom>"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Systematically diagnose bug, confirm root cause with user, then fix via slice + ship.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<observability>
Emit a Phase D feedback event before analysis begins. Non-blocking — do not halt if the CLI is absent or args are invalid.

```bash
tff-tools routing:event --kind debug --slice <slice_id> 2>/dev/null || true
```
</observability>

<execution_context>
Execute debug workflow from @workflows/debug.md.
</execution_context>
