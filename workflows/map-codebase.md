# Map Codebase

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Analyze codebase → structured docs via parallel doc-writer agents.

## Prerequisites
`.tff-cc/docs/` output dir ∃ (created by caller)

## Steps
1. `mkdir -p .tff-cc/docs`
2. LOAD @skills/codebase-documentation/SKILL.md → SPAWN 3 subagents ∈ parallel:
   - **tech**: write STACK.md → `.tff-cc/docs/STACK.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **arch**: write ARCHITECTURE.md → `.tff-cc/docs/ARCHITECTURE.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **concerns**: write CONCERNS.md → `.tff-cc/docs/CONCERNS.md`
3. LOAD @skills/codebase-documentation/SKILL.md → SPAWN subagent: read ARCHITECTURE.md + STACK.md → write CONVENTIONS.md
   - document: naming, imports, error handling, test structure, function design
4. COMMIT: `git add .tff-cc/docs/ && git commit -m "docs: map codebase"`
5. SUMMARY: list generated files (STACK, ARCHITECTURE, CONCERNS, CONVENTIONS)
6. NEXT: @references/next-steps.md
