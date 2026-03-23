---
name: test-driven-development
description: "Use when implementing features/fixes where TDD required (F-lite, F-full). Iron law: ¬∃ production code without failing test."
token-budget: critical
---

# Test-Driven Development

## When to Use

∀ features/fixes where TDD required (F-lite, F-full tiers). S-tier skips TDD.

## HARD-GATE

¬∃ production_code without failing_test_first. If code exists before test -> DELETE IT and start over. The sunk cost is irrelevant — the time is gone regardless.

## Cycle

RED(write 1 test -> run -> observe FAIL) -> GREEN(minimal code to pass) -> REFACTOR(structure, tests stay green)

### RED

```typescript
it('should validate email format', () => {
  const result = validateEmail('not-an-email');
  expect(isErr(result)).toBe(true);
});
```

Rules: 1 behavior/test | descriptive name | `describe`/`it`/`expect` (¬`test()`) | MUST run ∧ watch FAIL

∀ test: fails for right reason (missing feature ¬syntax error). GREEN before impl -> feature exists ∨ test wrong — investigate.

### GREEN

```typescript
export const validateEmail = (email: string): Result<string, Error> => {
  if (!email.includes('@')) return Err(new Error('Invalid email'));
  return Ok(email);
};
```

Only enough code to pass. No more.

### REFACTOR

Improve structure, ¬change behavior, tests stay green.

## Agent Routing (F-lite/F-full)

1. Tester subagent writes failing .spec.ts -> commits
2. Domain subagent implements -> tests pass -> commits
3. Tester subagent verifies coverage ∧ edge cases

## Sunk Cost Rule

Deleting hours of work to start test-first is correct. The time is gone regardless. Starting over with proper TDD produces better code faster than retrofitting tests.

## 3-Fix Red Flag

3+ test fixes attempted -> question the design, not the test. The test is probably right; the implementation approach is wrong.

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| Tests after impl | Never verified test catches failures | Write test first -> watch fail -> implement |
| Mock behavior testing | `expect(mock).toHaveBeenCalled()` tests mock, ¬code | Use in-memory adapters implementing real interface |
| Over-mocking | Mock everything, test nothing real | In-memory adapters: real interface, ¬I/O |
| "Too simple for TDD" | Simple code is where hidden bugs live | Follow the cycle regardless |

## Gate (∀ must be true before DONE)

1. ∀ tests failed before impl? 2. Suite passes? 3. Testing behavior ∨ mock? (mock -> stop) 4. Catches regression? (¬ -> rewrite)

## Framework

Vitest: `describe`/`it`/`expect`/`beforeEach`/`afterEach` | ¬`test()` | colocated `.spec.ts` | `globals: true`
