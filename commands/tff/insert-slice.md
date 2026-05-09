---
name: tff:insert-slice
description: Insert a slice between existing slices
argument-hint: "<after-slice-id> <slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Insert new slice between existing slices, adjusting dependencies.
</objective>

<execution_context>
1. Validate target position (after-slice-id)
2. Ask user for new slice title
3. PROMPT user inline for branch name with default `feat/<slugified-title>`
4. Create new slice with correct dependencies:
   `tff-tools slice:create --milestone-id <id> --title <title> --branch <name>`
   (additional dep wiring via `tff-tools dep:add-slice`)
5. Update downstream slice dependencies
</execution_context>
