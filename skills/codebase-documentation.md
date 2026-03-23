---
name: codebase-documentation
description: "Use when generating or maintaining codebase documentation. Divio framework."
token-budget: workflow
---

# Codebase Documentation

## When to Use

∀ map-codebase workflow. ∀ documentation tasks.

## Divio Framework

| Type | Purpose | Audience | Style |
|---|---|---|---|
| Tutorial | Learning-oriented | New developer | Step-by-step, "do this, then this" |
| How-to | Task-oriented | Working developer | "To achieve X, do Y" |
| Reference | Information-oriented | Any developer | Accurate, complete, terse |
| Explanation | Understanding-oriented | Curious developer | Discursive, "why" focused |

## Documentation Outputs

| File | Focus | Content |
|---|---|---|
| STACK.md | Technology | Languages, frameworks, tools, versions, rationale |
| ARCHITECTURE.md | Structure | Patterns, layers, boundaries, data flow |
| CONCERNS.md | Cross-cutting | Tech debt, security, fragile areas, missing coverage |
| CONVENTIONS.md | Standards | Naming, file structure, commit format, review process |

## Process

1. Read focus from prompt (tech/arch/concerns/conventions)
2. Glob -> relevant files (targeted)
3. Grep -> patterns (imports, TODOs, configs)
4. Read key files -> write to `.tff/docs/`
5. Report brief confirmation

## Anti-Patterns

- Speculating about code behavior (¬verified -> say "not found")
- Including implementation details that change frequently
- Duplicating what's in README.md
- Writing prose when tables suffice

## Rules

- Reference style for generated docs (terse, accurate)
- ∀ secrets: ¬read ∧ ¬quote
- ∀ paths: backtick format
- ∀ doc: <= 200 lines
- Include "last generated" timestamp
