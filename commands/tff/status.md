---
name: tff:status
description: Show current position in the lifecycle with next step suggestion
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Lightweight status check — show where you are ∈ the tff lifecycle ∧ suggest the next command. Does NOT regenerate STATE.md (use /tff:progress for that).
</objective>

<execution_context>
1. Read .tff/STATE.md if it ∃ (don't regenerate)
2. Check state for any ∈-progress slices
3. Show the current position:
   - Active milestone
   - Current slice ∧ its status
   - What phase we're ∈
4. Suggest next command from @references/next-steps.md

If ¬ project ∃, suggest /tff:new.
If ¬ STATE.md ∃, suggest /tff:progress to generate it.
</execution_context>
