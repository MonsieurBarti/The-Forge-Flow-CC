---
name: tff:verify
description: Verify acceptance criteria via product-lead and plannotator
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Verify the slice implementation against acceptance criteria.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the verify-slice workflow from @workflows/verify-slice.md.
</execution_context>
