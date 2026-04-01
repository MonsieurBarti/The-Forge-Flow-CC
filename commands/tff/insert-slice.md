---
name: tff:insert-slice
description: Insert a slice between existing slices
argument-hint: "<after-slice-id> <slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Insert a new slice between existing slices, adjusting dependencies.
</objective>

<execution_context>
1. Validate the target position
2. Create new slice with correct dependencies
3. Update downstream slice dependencies
</execution_context>
