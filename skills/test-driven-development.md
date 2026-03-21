---
name: Test-Driven Development
description: TDD cycle and rules for feature implementation
token-budget: critical
---

# Test-Driven Development

## When to Use

∀ features/fixes where TDD required (F-lite, F-full tiers). S-tier skips TDD.

## LAW: ¬∃ production_code without failing_test

## Cycle

RED(write 1 test → run → observe FAIL) → GREEN(minimal code to pass) → REFACTOR(structure, tests stay green)

### RED

```typescript
it('should validate email format', () => {
  const result = validateEmail('not-an-email');
  expect(isErr(result)).toBe(true);
});
```

Rules: 1 behavior/test | descriptive name | `describe`/`it`/`expect` (¬`test()`) | MUST run ∧ watch FAIL

### GREEN

```typescript
export const validateEmail = (email: string): Result<string, Error> => {
  if (!email.includes('@')) return Err(new Error('Invalid email'));
  return Ok(email);
};
```

Only enough code to pass. No more.

### REFACTOR — improve structure, ¬change behavior, tests stay green

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| Mock behavior testing | `expect(mock).toHaveBeenCalled()` tests mock, ¬code | Use in-memory adapters implementing real interface |
| Tests after impl | Never verified test catches failures | Write test first → watch fail → implement |
| Over-mocking | Mock everything, test nothing real | In-memory adapters: real interface, ¬I/O |

## Gate (∀ must be true before DONE)

1. ∀ tests failed before impl? 2. Suite passes? 3. Testing behavior ∨ mock? (mock → stop) 4. Catches regression? (¬ → rewrite)

## Framework

Vitest: `describe`/`it`/`expect`/`beforeEach`/`afterEach` | ¬`test()` | colocated `.spec.ts` | `globals: true`
