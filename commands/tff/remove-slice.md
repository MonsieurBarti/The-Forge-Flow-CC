---
name: tff:remove-slice
description: Remove a future slice from the milestone
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Remove a slice that hasn't been started yet. Only future slices (discussing status) can be removed.
</objective>

<execution_context>
1. Verify slice is in discussing status (not started)
2. Remove bead and update dependencies
3. Renumber subsequent slices
</execution_context>
