---
name: verification-before-completion
description: "Use when completing any task. Evidence before claims, always."
---

# Verification Before Completion

## When to Use

∀ task completion, ∀ "it works" claims, ∀ pre-commit, ∀ pre-PR.

## HARD-GATE

¬claim success without fresh verification evidence in current session.

## The Rule

If you didn't run the command in this message, you cannot claim it passes.

## Verification Checklist

∀ task marked DONE:
1. RUN tests: `npm test` or specific spec file -> show output
2. RUN typecheck: `npx tsc --noEmit` -> show output
3. RUN lint: `npx biome check` -> show output
4. VERIFY: Output shows pass, ¬assume from prior run

## Forbidden Language

- "should work" -> RUN IT
- "probably passes" -> RUN IT
- "I believe this is correct" -> VERIFY IT
- "tests were passing earlier" -> RUN THEM AGAIN

## Anti-Patterns

- Claiming tests pass based on memory of earlier run
- Committing without running tests first
- Trusting agent reports without fresh execution
- "It compiled, therefore it works"

## Rules

- Evidence = command output in current session
- ¬extrapolate from partial evidence
- If verification fails, FIX before claiming done
- This skill overrides urgency ("we need to ship" ¬excuses skipping verification)
