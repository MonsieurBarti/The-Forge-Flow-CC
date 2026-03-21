---
name: tff:rollback
description: Revert execution commits for a slice
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Revert all execution-generated commits for a slice back to the checkpoint base commit.
</objective>

<execution_context>
Execute the rollback workflow from @workflows/rollback.md.
</execution_context>
