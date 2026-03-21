---
name: tff:debug
description: Diagnose and fix a bug with systematic debugging — diagnosis first, then fix via slice
argument-hint: "<error description or symptom>"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Systematically diagnose a bug, confirm root cause with user, then fix via slice + ship.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the debug workflow from @workflows/debug.md.
</execution_context>
