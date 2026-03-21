---
name: tff:detect-patterns
description: Extract, aggregate, and rank patterns from tool-use observations
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Run the pattern detection pipeline on observed tool sequences to find recurring workflows worth turning into skills.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the detect-patterns workflow from @workflows/detect-patterns.md.
</execution_context>
