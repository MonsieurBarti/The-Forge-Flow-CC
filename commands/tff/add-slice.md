---
name: tff:add-slice
description: Add a slice to the current milestone
argument-hint: "<slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Add new slice to end of current milestone's slice list.
</objective>

<execution_context>
1. Determine current milestone from state
2. Ask user for slice title (description)
3. PROMPT user inline for branch name with default `feat/<slugified-title>`
   (orchestrator drives prompt; tff-tools does ¬ prompt)
4. Create slice as child of milestone:
   `tff-tools slice:create --milestone-id <id> --title <title> --branch <name>`
   (kind defaults to milestone)
5. Slice number is auto-assigned by tff-tools
</execution_context>
