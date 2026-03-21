# Workflow: Create Skill

Draft a new skill from a pattern candidate or user description.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Steps

### 1. Get input

Either:
- A candidate number from `/tff:suggest-skills`
- A free-text description of the skill to create

If candidate number, load from `.tff/observations/candidates.jsonl`.

### 2. Spawn skill drafter

Spawn **tff-skill-drafter** agent in "Draft New Skill" mode:
- Provide pattern evidence (or description)
- Provide existing skills as format examples (read `skills/*.md`)
- Agent writes draft to `.tff/drafts/<skill-name>.md`

### 3. Validate

```bash
node <plugin-path>/tools/dist/tff-tools.cjs skills:validate '<json>'
```

If validation fails, ask the drafter to fix and re-validate.

### 4. Review via plannotator

```bash
plannotator annotate .tff/drafts/<skill-name>.md
```

User reviews and annotates the draft.

### 5. Handle outcome

- **Approved**: move from `.tff/drafts/<name>.md` to `skills/<name>.md`
- **Feedback**: revise draft based on annotations, re-submit to plannotator
- **Rejected**: delete draft

### Next Step

Based on the current state, suggest the appropriate next command from @references/next-steps.md.
