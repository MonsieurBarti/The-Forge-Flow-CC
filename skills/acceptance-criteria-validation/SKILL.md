---
name: acceptance-criteria-validation
description: "Use when verifying acceptance criteria. Binary verdict per criterion. Evidence-based."
---

# Acceptance Criteria Validation

## When to Use

∀ verification and acceptance testing. ∀ spec validation.

## HARD-GATE

∀ criterion: verdict is PASS or FAIL. ¬"partially met". ¬"close enough". Binary.

## Verification Process

∀ acceptance criterion in SPEC.md:
1. READ: Find the implementation that satisfies this criterion
2. RUN: Execute the test/command that proves it works
3. EVIDENCE: Record exact output (¬"should work", ¬"probably passes")
4. VERDICT: PASS (evidence proves it) or FAIL (evidence disproves it or missing)

## Output Format

| AC | Verdict | Evidence |
|---|---|---|
| AC1: User can login | PASS | `npm test -- auth.spec.ts` -> 4/4 passing |
| AC2: Rate limit at 100/min | FAIL | No rate limit test exists |

## Spec Validation (Discuss Phase)

∀ criterion must be:
- Testable: Can write a test for it
- Binary: Unambiguous pass/fail
- Scoped: Belongs to this scope (¬future work)
- Independent: ¬depends on unimplemented criteria from other scopes

## Anti-Patterns

- "Close enough" (binary: met ∨ ¬met)
- Trusting agent reports without running commands
- Testing implementation details instead of user-visible behavior
- Accepting criteria that aren't testable

## Rules

- Evidence before claims, always
- If you didn't run the command in this session, you cannot claim it passes
- ∀ FAIL: explain what's missing + what would make it PASS
- intent > letter — meets ∧ misses point -> FAIL
