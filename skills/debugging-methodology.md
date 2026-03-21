---
name: debugging-methodology
description: Systematic diagnostic methodology for the debug workflow orchestrator
token-budget: critical
---

## When to Use

∀ debug workflow: load this skill. Drives orchestrator investigation → root cause.

## Track A: Reproducible Error

User provides a stacktrace, error message, or failing test.

1. PARSE: extract file, line, error type, message
2. READ: implicated code in context (±30 lines)
3. TRACE: follow the call chain — how did execution reach here?
4. HYPOTHESIZE: what state/input causes this error?
5. VERIFY: run the failing case, confirm hypothesis matches
6. ROOT CAUSE: identify the minimal change that resolves it

## Track B: Symptom-Based

User describes unexpected behavior without a clear error.

1. CLARIFY: what is expected vs actual behavior?
2. REPRODUCE: find a reliable trigger (specific input, sequence, timing)
3. NARROW: binary search the scope
   - Recent commits: `git log --oneline -20`, `git bisect` if needed
   - Code paths: trace from entry point, isolate branches
4. INSTRUMENT: targeted logging/assertions to confirm theory
5. ISOLATE: pin down the exact root cause
6. ROOT CAUSE: identify the minimal change that resolves it

## Rules

1. ¬guess. ∀ hypothesis: verify before proposing a fix
2. Fix root cause, ¬symptom. Null check "fixes" crash → ask why value was null
3. Minimize blast radius — fix touches as little code as possible
4. Stall after 3 failed hypotheses → escalate to user with findings
5. Document root cause in commit message (¬just "fix bug")
6. ∀ investigation step: show user what you found and why it matters
