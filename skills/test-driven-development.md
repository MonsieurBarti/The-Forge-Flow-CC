# Skill: Test-Driven Development

## When to Use

Load this skill when implementing any feature or fix where TDD is required (F-lite and F-full complexity tiers). S-tier skips TDD.

## The Absolute Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

## The Cycle

### RED — Write one failing test

```typescript
it('should validate email format', () => {
  const result = validateEmail('not-an-email');
  expect(isErr(result)).toBe(true);
});
```

Rules:
- One behavior per test
- Descriptive test name that reads like a sentence
- Use `describe`/`it`/`expect` (never `test()`)
- You MUST run the test and WATCH IT FAIL before proceeding

### GREEN — Write minimal code to pass

Only write enough code to make the test pass. No more.

```typescript
export const validateEmail = (email: string): Result<string, Error> => {
  if (!email.includes('@')) return Err(new Error('Invalid email'));
  return Ok(email);
};
```

### REFACTOR — Clean up while tests stay green

Improve structure without changing behavior. Tests must still pass.

## Anti-Patterns

### Testing Mock Behavior (not real behavior)

BAD:
```typescript
const mock = vi.fn().mockReturnValue('data');
expect(mock).toHaveBeenCalled(); // Tests the mock, not real code
```

GOOD:
```typescript
const store = new InMemoryBeadStore();
const result = await initProject({ name: 'app', vision: 'v' }, { beadStore: store });
expect(isOk(result)).toBe(true); // Tests real behavior
```

### Writing Tests After Implementation

BAD: Write code first, then write tests that pass immediately.
WHY: You never verified the test catches failures. It might always pass.
FIX: Always write the test first. Watch it fail. Then implement.

### Over-Mocking

BAD: Mock every dependency, test nothing real.
GOOD: Use in-memory adapters that implement the real interface. They behave like the real thing but without I/O.

## Gate Function

Before reporting any test work as DONE:
1. Did every test fail before implementation? (mandatory)
2. Did I run the test suite and see all pass? (mandatory)
3. Am I testing behavior or mock existence? (if mock → stop)
4. Would this test catch a regression? (if no → rewrite)

## Framework

- Vitest: `describe`, `it`, `expect`, `beforeEach`, `afterEach`
- No `test()` alias
- Colocated `.spec.ts` files
- `globals: true` in vitest config
