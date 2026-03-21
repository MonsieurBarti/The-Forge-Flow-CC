---
name: tff:new
description: Initialize a new tff project with vision, requirements, and first milestone
argument-hint: "[project-name]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Initialize a new tff project backed by beads. Guide the user through defining their project vision, requirements, and first milestone.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the new-project workflow from @workflows/new-project.md end-to-end.
</execution_context>
