# Map Codebase

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Analyze codebase → structured docs via parallel doc-writer agents.

## Prerequisites
`.tff/docs/` output dir exists (created by caller)

## Steps
1. `mkdir -p .tff/docs`
2. LOAD @skills/codebase-documentation.md → SPAWN 3 subagents in parallel:
   - **tech**: write STACK.md → `.tff/docs/STACK.md` (load @skills/hexagonal-architecture.md)
   - **arch**: write ARCHITECTURE.md → `.tff/docs/ARCHITECTURE.md` (load @skills/hexagonal-architecture.md)
   - **concerns**: write CONCERNS.md → `.tff/docs/CONCERNS.md`
3. LOAD @skills/codebase-documentation.md → SPAWN subagent: read ARCHITECTURE.md + STACK.md → write CONVENTIONS.md
   - document: naming, imports, error handling, test structure, function design
4. COMMIT: `git add .tff/docs/ && git commit -m "docs: map codebase"`
5. SUMMARY: list generated files (STACK, ARCHITECTURE, CONCERNS, CONVENTIONS)
6. NEXT: @references/next-steps.md
