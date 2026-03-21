---
name: Hexagonal Architecture
description: Ports & adapters architecture rules for tff tooling
token-budget: critical
---

# Hexagonal Architecture

## When to Use

∀ code following hexagonal (ports & adapters) pattern. Applies to all tff tooling.

## Layer Dependency (Iron Law)

```
Domain ← Application ← Infrastructure ← Presentation
∀ layer L: imports(L) ⊆ layers_below(L) — NO EXCEPTIONS
domain.imports = {zod, node:crypto, Result} — NOTHING else
```

| Layer | May Import | Responsibility |
|---|---|---|
| Domain | ∅ (only zod, crypto, Result) | Entities, VOs, Ports, Events, Errors, Result\<T,E\> |
| Application | Domain | Use cases, orchestration |
| Infrastructure | Domain | Implements ports (adapters) |
| Presentation | All | CLI/commands, wiring |

## Ports & Adapters

Port = domain interface (capability needed) → Adapter = infra implementation (fulfills contract)

```typescript
// Domain port
interface BeadStore {
  create(input: { label: string; title: string }): Promise<Result<BeadData, DomainError>>;
}
// Infra adapter
class BdCliAdapter implements BeadStore { async create(input) { /* bd CLI */ } }
// Test adapter
class InMemoryBeadStore implements BeadStore { async create(input) { /* Map */ } }
```

## Type Rules

- Zod schemas = single source of truth: `z.infer<typeof Schema>`
- ¬enum → `z.enum()`; ¬class inheritance → composition
- ∀ fallible ops → Result\<T,E\>, never throw
- `z.uuid()` not `z.string().uuid()` (Zod v4)

## Testing

- Unit: in-memory adapters (¬real I/O) | Integration: real adapters
- Colocated `.spec.ts` next to source

## Anti-Patterns (∀ → VIOLATION)

- domain imports adapter | app imports `node:fs` (use port) | domain throws (use Result)
