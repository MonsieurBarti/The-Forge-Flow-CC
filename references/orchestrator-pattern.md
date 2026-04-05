# Orchestrator Pattern

tff workflows are orchestrators. They coordinate — they don't do heavy work.

## Rules

1. **Workflows stay small.** The orchestrator's job is to:
   - Check current state (read state via tff-tools)
   - Spawn the right agent for the job (via Agent tool)
   - Pass the agent exactly what it needs (¬ more, ¬ less)
   - Handle the agent's result (transition state, report to user)
   - Suggest the next step

2. **Agents do the heavy lifting.** All reading, writing, thinking, ∧ coding happens ∈ sub-agents with fresh context windows.

3. **Pass context, don't inherit it.** When spawning an agent, provide:
   - The task description ∧ acceptance criteria
   - Relevant file paths (¬ file contents — let the agent read them)
   - The project conventions reference
   - What status protocol to use (@references/agent-status-protocol.md)

4. **Never load large files ∈ the orchestrator.** If a workflow needs to understand code, spawn an agent to do it.

5. **State transitions go through tff-tools.** The orchestrator calls `tff-tools.cjs` for all state changes. Agents don't transition state directly.

6. **Check tff-tools results for errors.** Every `tff-tools` call returns `{ "ok": true, ... }` ∨ `{ "ok": false, "error": { "code": "...", "message": "..." } }`. The orchestrator MUST check `ok` — if `false`:
   - Log the error: `⚠ tff-tools <command> failed: <message>`
   - For state transitions: warn user ∧ offer retry ∨ abort
   - For non-critical operations (snapshot, checkpoint): warn but continue
   - NEVER silently continue after a failed state transition

## Anti-Patterns

- Reading entire codebases ∈ the workflow (spawn an agent instead)
- Implementing code ∈ the workflow (that's the executor agent's job)
- Making architecture decisions ∈ the workflow (that's the architect's job)
- Long workflow files with complex logic (break into agent spawns)

## Exception: Conversation-Driven Workflows

discuss workflow: orchestrator drives Q&A directly via AskUserQuestion (rule 2 exception).
Reason: multi-turn user context ¬delegable to subagent.
Agents spawned for independent tasks only (challenge, validate, review).
∀ other workflows: standard pattern applies.

## Template

Every workflow step should be one of:
1. **Check** — read state via tff-tools ∨ file read
2. **Spawn** — dispatch agent via Agent tool
3. **Handle** — process agent result
4. **Transition** — call tff-tools to update state
5. **Suggest** — show user what to do next (@references/next-steps.md)
