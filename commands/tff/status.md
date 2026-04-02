---
name: tff:status
description: Show current position in the lifecycle with next step suggestion
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Lightweight status check — show where you are in the tff lifecycle and suggest the next command. Does NOT regenerate STATE.md (use /tff:progress for that).
</objective>

<execution_context>
1. Read .tff/STATE.md if it exists (don't regenerate)
2. Check state for any in-progress slices
3. Show the current position:
   - Active milestone
   - Current slice and its status
   - What phase we're in
4. Suggest next command from @references/next-steps.md

If no project exists, suggest /tff:new.
If no STATE.md exists, suggest /tff:progress to generate it.
</execution_context>
