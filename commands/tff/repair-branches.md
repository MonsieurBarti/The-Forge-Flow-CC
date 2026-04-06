---
name: tff:repair-branches
description: Repair missing state branches for milestones and slices
allowed-tools: Read, Bash
---

<objective>
Scan all milestones and slices, create any missing tff-state/* branches.
</objective>

<execution_context>
Run `node tools/dist/tff-tools.cjs state:repair-branches [--dry-run]`
</execution_context>

<output>
Report created/failed/skipped counts with summary.
</output>
