---
name: tff:new
description: Initialize a new tff project with vision, requirements, and first milestone
argument-hint: "[project-name]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent
---

<objective>
Initialize new tff project. Guide user through defining project vision, requirements, ∧ first milestone.
</objective>

<context>
Read tff conventions: @references/conventions.md
</context>

<execution_context>
Execute new-project workflow from @workflows/new-project.md end-to-end.
</execution_context>
