---
name: tff:status
description: Show current position in the lifecycle with next step suggestion
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Lightweight status check — show where you are ∈ tff lifecycle ∧ suggest next command. Does NOT regenerate STATE.md (use /tff:progress for that).
</objective>

<execution_context>
1. Read .tff-cc/STATE.md if ∃ (don't regenerate)
2. Check for in-progress slices: `tff-tools slice:list` (no filter) → identify
   slices with status ∉ {closed}
3. Show current position:
   - Active milestone (if ∃)
   - Active milestone slices (kind=milestone, status ≠ closed)
   - Active quick tasks (kind=quick, status ≠ closed) — read from
     `.tff-cc/quick/STATE.md` if ∃ ∨ via `tff-tools slice:list --kind quick`
   - Active debug tasks (kind=debug, status ≠ closed) — read from
     `.tff-cc/debug/STATE.md` if ∃ ∨ via `tff-tools slice:list --kind debug`
   - What phase the active slice is ∈
4. Suggest next command from @references/next-steps.md

If ¬ project ∃, suggest /tff:new.
If ¬ STATE.md ∃ for the active scope, suggest /tff:progress to generate it.
</execution_context>
