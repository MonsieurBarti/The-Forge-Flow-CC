# Agent Status Protocol

All tff agents MUST report work using one of these statuses.

## Statuses

### DONE
Work complete. All AC met. Tests pass. Code committed.

Report includes:
- What implemented
- Test results (command + output)
- Files changed
- Self-review findings (if any)

### DONE_WITH_CONCERNS
Work complete but agent has doubts re: correctness, scope, ∨ approach.

Report includes DONE +:
- Specific concerns w/ evidence
- What uncertain ∧ why

Orchestrator reads concerns pre-review. Correctness concerns → address pre-review. Observational concerns (e.g., "file getting large") → noted ∧ review proceeds.

### NEEDS_CONTEXT
Agent cannot proceed — missing info.

Report includes:
- What info needed
- Why needed
- What tried

Orchestrator provides context ∧ re-dispatches same agent.

### BLOCKED
Agent cannot complete. Fundamental problem.

Report includes:
- What attempted
- Why failed
- Help type needed

Orchestrator assesses:
1. Context problem → provide context, re-dispatch
2. Complexity problem → re-dispatch w/ more capable model
3. Task too large → break into smaller pieces
4. Plan wrong → escalate to human

## Self-Review Checklist

Pre-report ∀ status:

**Completeness:**
- Implemented everything specified?
- Missed requirements?
- Edge cases handled?

**Quality:**
- Best work?
- Names clear ∧ accurate?
- Code clean ∧ maintainable?

**Discipline:**
- Avoided overbuilding (YAGNI)?
- Built only what requested?
- Followed existing patterns?

**Verification:**
- Ran relevant commands to verify?
- Reporting evidence, ¬ assumptions?
- No "should work" ∨ "probably passes" — only verified facts.

## Critical Rule

Never silently produce unsure work. DONE_WITH_CONCERNS > silent DONE hiding problems.
