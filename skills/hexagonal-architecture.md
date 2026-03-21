# Skill: Hexagonal Architecture

## When to Use

Load this skill when working on code that follows hexagonal (ports & adapters) architecture. Applies to all tff tooling code and any project that uses this pattern.

## Rules

### Layer Dependencies (The Iron Law)

```
Domain ← Application ← Infrastructure ← Presentation
```

- **Domain** imports NOTHING from other layers. Only Zod, `node:crypto`, and Result.
- **Application** imports Domain only. Never Infrastructure.
- **Infrastructure** implements Domain ports. Imports Domain types.
- **Presentation** (CLI, commands) wires everything together.

Violating this direction is ALWAYS wrong. No exceptions.

### Domain Layer

The domain layer contains:
- **Entities** — aggregate roots with identity and lifecycle (e.g., Project, Slice, Task)
- **Value Objects** — immutable types defined by their attributes (e.g., ComplexityTier, SliceStatus)
- **Ports** — interfaces that define what the domain NEEDS from the outside world
- **Events** — things that happened in the domain
- **Errors** — domain-specific failure types
- **Result\<T, E\>** — the monad for fallible operations. Never throw.

### Ports & Adapters

- **Port** = interface in the domain layer. Defines a capability the domain needs.
- **Adapter** = implementation in the infrastructure layer. Fulfills the port contract.

Example:
```typescript
// Domain port (interface)
interface BeadStore {
  create(input: { label: string; title: string }): Promise<Result<BeadData, DomainError>>;
}

// Infrastructure adapter (implementation)
class BdCliAdapter implements BeadStore {
  async create(input) { /* shells out to bd CLI */ }
}

// Test adapter (implementation)
class InMemoryBeadStore implements BeadStore {
  async create(input) { /* stores in Map */ }
}
```

### Type Rules

- Zod schemas are the single source of truth: `z.infer<typeof Schema>`
- No TypeScript `enum` — use `z.enum()`
- No class inheritance in domain — use composition
- Result\<T, E\> for all fallible operations — never throw

### Testing

- Unit tests use in-memory adapters (never real I/O)
- Integration tests use real adapters (filesystem, CLI)
- Colocated `.spec.ts` files next to the code they test

### Anti-Patterns

- Domain entity importing an adapter → VIOLATION
- Application service importing `node:fs` → VIOLATION (use ArtifactStore port)
- Throwing exceptions from domain code → VIOLATION (use Result)
- `z.string().uuid()` → WRONG in Zod v4 (use `z.uuid()`)
