# Workflow: Learn (Skill Refinement)

Detect corrections to existing skills and propose refinements.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- Observation is enabled
- Skills exist in `skills/`
- Sufficient observations (3+ corrections)

## Steps

### 1. Check drift

For each skill in `skills/`, compare against observation patterns:
```bash
node <plugin-path>/tools/dist/tff-tools.cjs skills:drift "<original>" "<current>"
```

### 2. Identify divergences

Compare actual tool sequences from `sessions.jsonl` against the skill's documented workflow steps. Flag consistent deviations (3+ occurrences).

### 3. Propose refinement

If divergences found, spawn **tff-skill-drafter** agent in "Refine Existing Skill" mode:
- Provide original skill content
- Provide divergence evidence
- Agent proposes bounded diff (max 20% change)
- Draft saved to `.tff/drafts/<skill-name>.md`

### 4. Check bounded constraints

- Max 20% content change per refinement
- Max 60% cumulative drift from original
- 7-day cooldown between refinements

If any constraint violated, warn user and suggest creating a new skill instead.

### 5. Review via plannotator

```bash
plannotator annotate .tff/drafts/<skill-name>.md
```

### 6. Handle outcome

- **Approved**: archive original to `.tff/observations/skill-history/<name>.v<N>.md`, update `skills/<name>.md`
- **Rejected**: record as intentional divergence (don't suggest again)

### Next Step

Based on the current state, suggest the appropriate next command from @references/next-steps.md.
