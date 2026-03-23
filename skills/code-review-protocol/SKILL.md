---
name: code-review-protocol
description: "Use when reviewing or requesting code review. Two-stage protocol with fresh-reviewer enforcement."
---

# Code Review Protocol

## When to Use

∀ code reviews (spec compliance ∨ code quality).

## Two-Stage Protocol

Stage 1 (spec compliance) MUST pass before Stage 2 (code quality) runs.

| Stage | Role | Checks | Verdict |
|---|---|---|---|
| 1: Spec | spec reviewer | ∀ criteria implemented? Extra work? Correct interpretation? | PASS ∨ FAIL |
| 2: Quality | code quality reviewer | Correctness, tests (edge cases), patterns, YAGNI, readability | APPROVE ∨ REQUEST_CHANGES |

## Pre-Review Checklist (Before Requesting Review)

Before requesting review, verify:
1. ∀ tests pass (fresh run)
2. No debug code (console.log, debugger, TODO)
3. Commits clean and follow conventions
4. Changes match plan (no scope creep)

## Severity

| Level | Meaning | Blocks? |
|---|---|---|
| Critical | Bug, security, data loss | Yes |
| Important | Pattern violation, missing tests, unclear logic | Yes |
| Minor | Style, naming, comment | No |

## Calibration

Bug in prod? -> Critical | Confuses next dev? -> Important | ¬noticed in 1000-line diff? -> skip

## Fresh-Reviewer Enforcement

¬agent reviews code it wrote. Verify reviewer hasn't authored the code under review.

## Anti-Patterns

- ¬read code, trust report
- Review style before spec passes
- Flag pre-existing issues
- "Close enough" on spec (binary: met ∨ ¬met)
- Performative agreement on review feedback

## Rules

- ∀ finding: filepath:line required
- critical -> blocks merge; minor = advisory
- ∀ review: fresh agent (¬same agent that wrote code)
