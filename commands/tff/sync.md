---
name: tff:sync
description: Manual bidirectional markdown ↔ beads sync
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Run full bidirectional reconciliation between markdown files and beads.
</objective>

<execution_context>
1. Run sync:reconcile via tff-tools
2. Display sync report (created, updated, conflicts, orphans)
3. No silent data loss — report everything
</execution_context>
