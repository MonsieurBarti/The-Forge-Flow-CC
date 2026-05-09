---
name: tff:execute
description: Execute a slice with wave-based parallelism and TDD
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Execute all tasks ∈ slice using wave-based parallel execution with TDD enforcement.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute execute-slice workflow from @workflows/execute-slice.md.
</execution_context>
