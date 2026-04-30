---
name: tff:rollback
description: Revert execution commits for a slice
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Revert all execution-generated commits for slice back to checkpoint base commit.
</objective>

<execution_context>
Execute rollback workflow from @workflows/rollback.md.
</execution_context>
