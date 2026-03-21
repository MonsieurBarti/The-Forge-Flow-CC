---
name: tff:plan
description: Plan a slice with task decomposition and plannotator review
argument-hint: "[slice-id] [--tier S|F-lite|F-full]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion, Bash(plannotator:*)
---

<objective>
Create the task decomposition, detect waves, review via plannotator, and set up the worktree.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the plan-slice workflow from @workflows/plan-slice.md.
</execution_context>
