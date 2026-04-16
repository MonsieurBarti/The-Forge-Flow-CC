# Agent Status Protocol

All tff agents MUST report their work using one of these statuses.

## Statuses

### DONE
Work is complete. All acceptance criteria met. Tests pass. Code committed.

Report includes:
- What was implemented
- Test results (command + output)
- Files changed
- Self-review findings (if any)

### DONE_WITH_CONCERNS
Work is complete but the agent has doubts about correctness, scope, ∨ approach.

Report includes everything from DONE plus:
- Specific concerns with evidence
- What the agent is uncertain about ∧ why

The orchestrator reads concerns before proceeding to review. Correctness concerns are addressed before review. Observational concerns (e.g., "this file is getting large") are noted ∧ review proceeds.

### NEEDS_CONTEXT
The agent cannot proceed without information that wasn't provided.

Report includes:
- What specific information is needed
- Why it's needed
- What the agent has tried

The orchestrator provides the missing context ∧ re-dispatches the same agent.

### BLOCKED
The agent cannot complete the task. Something fundamental is wrong.

Report includes:
- What was attempted
- Why it failed
- What kind of help is needed

The orchestrator assesses:
1. Context problem → provide more context, re-dispatch
2. Complexity problem → re-dispatch with more capable model
3. Task too large → break into smaller pieces
4. Plan wrong → escalate to human

## Self-Review Checklist

Before reporting any status, every agent asks:

**Completeness:**
- Did I implement everything specified?
- Are there requirements I missed?
- Are edge cases handled?

**Quality:**
- Is this my best work?
- Are names clear ∧ accurate?
- Is the code clean ∧ maintainable?

**Discipline:**
- Did I avoid overbuilding (YAGNI)?
- Did I only build what was requested?
- Did I follow existing patterns?

**Verification:**
- Did I run the relevant commands to verify my work?
- Am I reporting evidence, ¬ assumptions?
- No "should work" ∨ "probably passes" — only verified facts.

## Critical Rule

Never silently produce work you're unsure about. DONE_WITH_CONCERNS is always better than a silent DONE that hides problems.
