---
name: tff:pause
description: Save execution checkpoint for later resume
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Save current execution state so it can be resumed later with `/tff:resume`.
</objective>

<execution_context>
1. Determine currently executing slice
2. Save checkpoint with current wave, completed tasks, executor log
3. Print resume instructions
</execution_context>
