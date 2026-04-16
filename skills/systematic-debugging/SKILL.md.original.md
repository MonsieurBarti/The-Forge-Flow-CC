---
name: systematic-debugging
description: "Use when debugging. 4-phase investigation, root cause, minimal fix."
---

# Systematic Debugging

## When to Use

∀ debug workflow: load this skill. Drives investigation -> root cause -> minimal fix.

## HARD-GATE

¬guess. ∀ hypothesis: verify before proposing a fix. ¬fix symptoms.

## Phase Model

### Phase 1: Investigation
- Track A (Reproducible): PARSE error -> READ implicated code (+-30 lines) -> TRACE call chain
- Track B (Symptom-based): CLARIFY expected vs actual -> REPRODUCE reliably -> NARROW via binary search

### Phase 2: Pattern Analysis
- Find working examples of similar code
- Identify differences: "what works vs what doesn't?"
- Compare code paths, inputs, state

### Phase 3: Hypothesis
- Form hypothesis from pattern analysis
- ∀ hypothesis: predict what you expect to see if true
- Verify prediction with targeted instrumentation

### Phase 4: Implementation
- ROOT CAUSE: identify the minimal change that resolves it
- Defense-∈-depth: multiple overlapping protections, ¬single-point fixes
- Condition-based waiting: replace sleep/polling with event-driven checks

## Escalation

- Stall after 3 failed hypotheses -> escalate to user with findings
- Blocked agents create follow-up task ∧ notify lead — work never silently stalls

## Anti-Patterns

- Guessing without verifying hypothesis
- Fixing symptoms (∅ check "fixes" crash -> ask WHY value was ∅)
- sleep/polling instead of condition-based waiting
- Single-point fix without defense-∈-depth

## Rules

- Fix root cause, ¬symptom
- Minimize blast radius — fix touches as little code as possible
- Document root cause ∈ commit message (¬just "fix bug")
- ∀ investigation step: show user what you found ∧ why it matters
- 3+ fixes attempted -> architectural problem, question the design
