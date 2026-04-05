---
name: tff:map-codebase
description: Analyze codebase with parallel doc-writer agents to produce structured documentation
argument-hint: "[focus: tech|arch|concerns|all]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent
---

<objective>
Spawn parallel doc-writer agents to analyze the codebase ∧ produce STACK.md, ARCHITECTURE.md, CONCERNS.md, ∧ CONVENTIONS.md ∈ .tff/docs/.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the map-codebase workflow from @workflows/map-codebase.md.

If a specific focus is provided (e.g., `/tff:map-codebase tech`), only run the agent for that focus area. Otherwise, run all 3 ∈ parallel + conventions.
</execution_context>
