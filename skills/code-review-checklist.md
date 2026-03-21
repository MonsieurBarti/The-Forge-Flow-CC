---
name: Code Review Checklist
description: Two-stage review protocol for spec and code quality
token-budget: critical
---

# Code Review Checklist

## When to Use

∀ code reviews (spec compliance ∨ code quality).

## Two-Stage Protocol

Stage 1 (spec compliance) MUST pass before Stage 2 (code quality) runs.

| Stage | Agent | Checks | Verdict |
|---|---|---|---|
| 1: Spec | tff-spec-reviewer | ∀ criteria implemented? Extra work? Correct interpretation? Reading actual code? | PASS ∨ FAIL |
| 2: Quality | tff-code-reviewer | Correctness, tests (edge cases), patterns, YAGNI, readability | APPROVE ∨ REQUEST_CHANGES |

## Severity

| Level | Meaning | Blocks? |
|---|---|---|
| Critical | Bug, security, data loss | Yes |
| Important | Pattern violation, missing tests, unclear logic | Yes |
| Minor | Style, naming, comment | No |

## Calibration

Bug in prod? → Critical | Confuses next dev? → Important | ¬noticed in 1000-line diff? → skip

## Anti-Patterns

- ¬read code, trust report | review style before spec passes | flag pre-existing issues | "close enough" on spec (binary: met ∨ ¬met)
