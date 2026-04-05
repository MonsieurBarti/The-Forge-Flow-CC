---
name: tff:execute
description: Execute a slice with wave-based parallelism and TDD
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Execute all tasks ∈ the slice using wave-based parallel execution with TDD enforcement.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the execute-slice workflow from @workflows/execute-slice.md.
</execution_context>
