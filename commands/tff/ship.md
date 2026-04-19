---
name: tff:ship
description: Slice PR with code review, security audit, and plannotator review
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
routing:
  pool:
    - tff-spec-reviewer
    - tff-code-reviewer
    - tff-security-auditor
---

<objective>
Run fresh reviewer enforcement, spawn review agents, review via plannotator, create ∧ merge slice PR.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute ship-slice workflow from @workflows/ship-slice.md.
</execution_context>
