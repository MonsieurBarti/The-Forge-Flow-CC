# Map Codebase

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Analyze codebase → structured docs via parallel doc-writer agents.

## Prerequisites
`project:init` has run (`.tff-cc/` symlink exists).

## Steps
1. LOAD @skills/codebase-documentation/SKILL.md → SPAWN 3 subagents ∈ parallel:
   - **tech**: write STACK.md → `.tff-cc/docs/STACK.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **arch**: write ARCHITECTURE.md → `.tff-cc/docs/ARCHITECTURE.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **concerns**: write CONCERNS.md → `.tff-cc/docs/CONCERNS.md`
2. LOAD @skills/codebase-documentation/SKILL.md → SPAWN subagent: read ARCHITECTURE.md + STACK.md → write CONVENTIONS.md
   - document: naming, imports, error handling, test structure, function design
3. NOTE: Docs written to `~/.tff-cc/{projectId}/docs/` — not tracked by git.
4. SUMMARY: list generated files (STACK, ARCHITECTURE, CONCERNS, CONVENTIONS)
5. NEXT: @references/next-steps.md
