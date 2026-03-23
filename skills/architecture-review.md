---
name: architecture-review
description: "Use when reviewing architecture decisions. C4 model, dependency inversion, hexagonal boundaries."
token-budget: critical
---

# Architecture Review

## When to Use

∀ plan reviews (F-lite, F-full). ∀ PRs that touch module boundaries.

## Checklist

1. DEPENDENCY DIRECTION: ∀ import: does it follow domain <- app <- infra <- presentation?
2. BOUNDARY CHECK: ∀ new module: is responsibility single and clear?
3. PORT/ADAPTER: ∀ external dependency: accessed through port? adapter exists?
4. COUPLING: ∀ cross-module call: through interface or direct import?
5. ADR: Architecture decision worth recording? -> create ADR

## Review Template

| Aspect | Status | Finding |
|---|---|---|
| Layer dependency | pass/fail | ... |
| Module boundaries | pass/fail | ... |
| Port coverage | pass/fail | ... |
| Cross-cutting concerns | pass/fail | ... |

## Anti-Patterns

- Reviewing code style (that's code-reviewer's job)
- Proposing rewrites for working code (YAGNI)
- ¬reading the spec before reviewing architecture
- Designing for hypothetical future requirements

## Rules

- Scope: architecture only, ¬code quality, ¬spec compliance
- ∀ finding: cite specific file + line
- Severity: Critical (blocks) | Important (should fix) | Suggestion (optional)
- ∀ deviation from patterns: justification required
