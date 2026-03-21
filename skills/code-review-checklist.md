# Skill: Code Review Checklist

## When to Use

Load this skill when performing any code review (spec compliance or code quality).

## Two-Stage Review Protocol

### Stage 1: Spec Compliance (tff-spec-reviewer)

Check ONLY whether the implementation matches the requirements:

| Check | Question |
|---|---|
| Coverage | Is every acceptance criterion implemented? |
| Extra work | Was anything built that wasn't requested? |
| Interpretation | Were requirements interpreted correctly? |
| Evidence | Am I reading actual code, not trusting the report? |

Verdict: PASS or FAIL. Nothing else matters at this stage.

### Stage 2: Code Quality (tff-code-reviewer)

Only runs AFTER spec compliance passes. Check:

| Check | Question |
|---|---|
| Correctness | Does the code do what it claims? |
| Tests | Are edge cases covered? Are tests meaningful? |
| Patterns | Does it follow existing codebase conventions? |
| YAGNI | Is there unnecessary complexity? |
| Readability | Can someone understand this without the PR description? |

Verdict: APPROVE or REQUEST_CHANGES with severity levels.

## Severity Guide

| Severity | Meaning | Blocks PR? |
|---|---|---|
| Critical | Bug, security issue, data loss risk | Yes |
| Important | Pattern violation, missing tests, unclear logic | Yes |
| Minor | Style preference, naming suggestion, comment | No |

## Calibration

Only flag issues that would cause real problems. Ask yourself:
- "Would this cause a bug in production?" → Critical
- "Would this confuse the next developer?" → Important
- "Would I notice this in a 1000-line diff?" → Probably minor, skip it

## Anti-Patterns

- Trusting the implementer's report without reading code
- Reviewing style when spec compliance hasn't passed yet
- Flagging pre-existing issues (only review what THIS change introduced)
- "Close enough" on spec compliance (criteria are binary: met or not met)
