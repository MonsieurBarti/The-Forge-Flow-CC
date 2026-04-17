---
name: tff:resume
description: Resume execution from a saved checkpoint
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Load the checkpoint ∧ resume execution from where it left off.
</objective>

<execution_context>
1. Load checkpoint for the slice
2. Skip completed waves
3. Continue execution from current wave
4. Delegates to execute-slice workflow with checkpoint data
</execution_context>
