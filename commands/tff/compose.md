---
name: tff:compose
description: Detect skill co-activation clusters and propose bundles or agents
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion, Bash(plannotator:*)
---

<objective>
Analyze skill co-activation patterns and propose skill bundles or specialized agent definitions.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the compose-skills workflow from @workflows/compose-skills.md.
</execution_context>
