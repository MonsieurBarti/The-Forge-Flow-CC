---
name: interactive-design
description: Use when running /tff:discuss to drive spec creation through structured conversation
token-budget: critical
---

## When to Use

∀ discuss workflow: load this skill. Drives orchestrator Q&A → SPEC.md.

## Conversation Rules

1. One question per message via AskUserQuestion
2. Multiple choice preferred (A/B/C/D) — open-ended when needed
3. Assess scope first: multi-subsystem → decompose before detailing
4. ∀ assumption: surface explicitly, ¬proceed on implicit agreement
5. Propose 2-3 approaches w/ trade-offs before committing

## Flow

1. SCOPE: goal, constraints, success criteria (2-4 questions)
2. APPROACH: propose 2-3, recommend one, user picks
3. DESIGN: section-by-section, user approves each via AskUserQuestion
   - F-lite: problem, approach, acceptance criteria, non-goals (~1 page)
   - F-full: + constraints, architecture, error handling, testing strategy (~3 pages)
4. WRITE: `.tff/slices/<id>/SPEC.md`
5. CHALLENGE: spawn tff-brainstormer (F-full only, max 2 iterations)
6. VALIDATE: spawn tff-product-lead → ∀ criterion: testable ∧ binary
7. REVIEW: dispatch anonymous spec-document-reviewer (max 3 iterations)
8. USER GATE: show spec, ask approval via AskUserQuestion

## Spec Template — F-lite

```
## Problem — what and why
## Approach — chosen from 2-3 proposed
## Acceptance Criteria — testable, binary (AC1, AC2, ...)
## Non-Goals — explicitly out of scope
```

## Spec Template — F-full

```
## Problem — what and why
## Constraints — time, tech, dependencies, team
## Approach — chosen from 2-3 proposed
## Architecture — boundaries, dependencies, patterns
## Acceptance Criteria — testable, binary (AC1, AC2, ...)
## Error Handling — failure modes and recovery
## Testing Strategy — what to test, how
## Non-Goals — explicitly out of scope
```

## Spec Document Reviewer Prompt

Dispatch via Agent tool (subagent_type: general-purpose) with prompt:

"You are reviewing a design spec for completeness and quality.
Read the spec at [path]. Tier: [F-lite | F-full].

| Check | F-lite | F-full |
|---|---|---|
| Problem statement clear | ✓ | ✓ |
| Approach chosen from alternatives | ✓ | ✓ |
| Acceptance criteria testable + binary | ✓ | ✓ |
| Non-goals explicitly stated | ✓ | ✓ |
| Constraints documented | - | ✓ |
| Architecture decisions justified | - | ✓ |
| Error handling defined | - | ✓ |
| Testing strategy defined | - | ✓ |
| No TODOs/placeholders/TBDs | ✓ | ✓ |
| No internal contradictions | ✓ | ✓ |
| Single subsystem scope | ✓ | ✓ |
| YAGNI — nothing unnecessary | ✓ | ✓ |

Calibration: only flag issues that cause real problems during planning.
∀ finding: explain WHY, not just WHAT. Approve unless serious gaps exist.

Report:
✅ Approved — spec ready for planning
OR
❌ Issues Found:
| # | Check | Issue | Suggestion |"

## Plan Document Reviewer Prompt

Dispatch via Agent tool (subagent_type: general-purpose) with prompt:

"Review the plan at [plan path]. Spec at [spec path].

| Check | Question |
|---|---|
| Completeness | ∀ acceptance criterion in spec has ≥1 task? |
| Task Decomposition | ∀ task has exact file paths, code, test commands? |
| Buildability | Could an engineer follow without getting stuck? |
| TDD | ∀ task has RED→GREEN→COMMIT cycle? |
| Traceability | ∀ task maps to ≥1 acceptance criterion? |
| YAGNI | No tasks beyond spec scope? |
| File Structure | Files mapped before tasks? ∀ file: one responsibility? |

Calibration: only flag issues that cause real problems during execution.
Report: ✅ Approved OR ❌ Issues with specifics."
