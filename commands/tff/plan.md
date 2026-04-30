---
name: tff:plan
description: Plan a slice with task decomposition and plannotator review
argument-hint: "[slice-id] [--tier S|SS|SSS]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Create task decomposition, detect waves, review via plannotator, ∧ set up worktree.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute plan-slice workflow from @workflows/plan-slice.md.
</execution_context>
