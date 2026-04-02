---
name: tff:add-slice
description: Add a slice to the current milestone
argument-hint: "<slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Add a new slice to the end of the current milestone's slice list.
</objective>

<execution_context>
1. Determine current milestone from state
2. Create new slice as child of milestone
3. Assign next available slice number
4. Ask user for slice description
</execution_context>
