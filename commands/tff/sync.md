---
name: tff:sync
description: Regenerate STATE.md from SQLite
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Regenerate STATE.md from current SQLite state.
</objective>

<execution_context>
1. Run sync:state via tff-tools
2. Display sync report
3. No silent data loss — report everything
</execution_context>
