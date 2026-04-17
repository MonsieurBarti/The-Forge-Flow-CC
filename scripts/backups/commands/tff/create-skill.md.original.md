---
name: tff:create-skill
description: Draft a new skill from a detected pattern or description
argument-hint: "<candidate-number|description>"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Create a new skill file from pattern evidence ∨ a user description. Draft reviewed via plannotator before deployment.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the create-skill workflow from @workflows/create-skill.md.
</execution_context>
