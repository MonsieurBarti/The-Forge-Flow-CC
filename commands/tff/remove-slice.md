---
name: tff:remove-slice
description: Remove a future slice from the milestone
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Remove slice that hasn't been started yet. Only future slices (discussing status) can be removed.
</objective>

<execution_context>
1. Verify slice ∈ discussing status (¬ started)
2. Remove slice ∧ update dependencies
3. Renumber subsequent slices
</execution_context>
