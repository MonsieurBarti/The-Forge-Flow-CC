---
name: tff:create-skill
description: Draft a new skill from a detected pattern or description
argument-hint: "<candidate-number|description>"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Create new skill file from pattern evidence ∨ user description. Draft reviewed via plannotator before deployment.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute create-skill workflow from @workflows/create-skill.md.
</execution_context>
