---
name: tff:sync
description: Regenerate STATE.md from SQLite
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Regenerate STATE.md from current SQLite state.
</objective>

<execution_context>
1. Run sync:reconcile via tff-tools
2. Display sync report (created, updated, conflicts, orphans)
3. No silent data loss — report everything
</execution_context>
