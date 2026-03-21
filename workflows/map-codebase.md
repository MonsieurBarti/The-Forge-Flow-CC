# Map Codebase

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Analyze codebase → structured docs via parallel doc-writer agents.

## Prerequisites
tff project exists

## Steps
1. `mkdir -p .tff/docs`
2. SPAWN 3 tff-doc-writer agents in parallel:
   - **tech**: write STACK.md → `.tff/docs/STACK.md` (load @skills/hexagonal-architecture.md)
   - **arch**: write ARCHITECTURE.md → `.tff/docs/ARCHITECTURE.md` (load @skills/hexagonal-architecture.md)
   - **concerns**: write CONCERNS.md → `.tff/docs/CONCERNS.md`
3. SPAWN tff-doc-writer: read ARCHITECTURE.md + STACK.md → write CONVENTIONS.md
   - document: naming, imports, error handling, test structure, function design
4. COMMIT: `git add .tff/docs/ && git commit -m "docs: map codebase"`
5. SUMMARY: list generated files (STACK, ARCHITECTURE, CONCERNS, CONVENTIONS)
6. NEXT: @references/next-steps.md
