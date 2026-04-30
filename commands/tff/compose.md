---
name: tff:compose
description: Detect skill co-activation clusters and propose bundles or agents
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Analyze skill co-activation patterns ∧ propose skill bundles ∨ specialized agent definitions.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute compose-skills workflow from @workflows/compose-skills.md.
</execution_context>
