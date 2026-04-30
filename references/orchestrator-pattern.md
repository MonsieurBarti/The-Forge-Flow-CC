# Orchestrator Pattern

tff workflows are orchestrators. They coordinate — they don't do heavy work.

## Rules

1. **Workflows stay small.** Orchestrator's job:
   - Check current state (read via tff-tools)
   - Spawn right agent for job (via Agent tool)
   - Pass agent exactly what it needs (¬ more, ¬ less)
   - Handle agent result (transition state, report to user)
   - Suggest next step

2. **Agents do heavy lifting.** All reading, writing, thinking, ∧ coding happens ∈ sub-agents with fresh context windows.

3. **Pass context, don't inherit.** When spawning agent, provide:
   - Task description ∧ AC
   - Relevant file paths (¬ contents — let agent read)
   - Project conventions reference
   - Status protocol to use (@references/agent-status-protocol.md)

4. **Never load large files ∈ orchestrator.** If workflow needs to understand code, spawn agent.

5. **State transitions go through tff-tools.** Orchestrator calls `tff-tools.cjs` for all state changes. Agents don't transition state directly.

6. **Check tff-tools results for errors.** Every call returns `{ "ok": true, ... }` ∨ `{ "ok": false, "error": { "code": "...", "message": "..." } }`. Orchestrator MUST check `ok` — if `false`:
   - Log error: `⚠ tff-tools <command> failed: <message>`
   - For state transitions: warn user ∧ offer retry ∨ abort
   - For non-critical operations (snapshot, checkpoint): warn but continue
   - NEVER silently continue after failed state transition

## Anti-Patterns

- Reading entire codebases ∈ workflow (spawn agent instead)
- Implementing code ∈ workflow (executor agent's job)
- Making architecture decisions ∈ workflow (architect's job)
- Long workflow files w/ complex logic (break into agent spawns)

## Exception: Conversation-Driven Workflows

discuss workflow: orchestrator drives Q&A directly inline (rule 2 exception).
Reason: multi-turn user context ¬delegable to subagent.
Agents spawned for independent tasks only (challenge, validate, review).
∀ other workflows: standard pattern applies.

## Template

Every workflow step should be one of:
1. **Check** — read state via tff-tools ∨ file read
2. **Spawn** — dispatch agent via Agent tool
3. **Handle** — process agent result
4. **Transition** — call tff-tools to update state
5. **Suggest** — show user next step (@references/next-steps.md)
