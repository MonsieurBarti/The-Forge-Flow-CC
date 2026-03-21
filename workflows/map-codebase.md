# Workflow: Map Codebase

Analyze the codebase and produce structured documentation using parallel doc-writer agents.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- A tff project exists in this repo

## Steps

### 1. Create docs directory

```bash
mkdir -p .tff/docs
```

### 2. Spawn doc-writer agents in parallel

Spawn 3 **tff-doc-writer** agents simultaneously using the Agent tool, each with a different focus:

**Agent 1 — Tech focus:**
> You are the doc-writer with focus: tech.
> Explore the codebase and write STACK.md to .tff/docs/STACK.md.
> Follow your agent definition at @agents/tff-doc-writer.md.
> Load the hexagonal-architecture skill: @skills/hexagonal-architecture.md

**Agent 2 — Architecture focus:**
> You are the doc-writer with focus: arch.
> Explore the codebase and write ARCHITECTURE.md to .tff/docs/ARCHITECTURE.md.
> Follow your agent definition at @agents/tff-doc-writer.md.
> Load the hexagonal-architecture skill: @skills/hexagonal-architecture.md

**Agent 3 — Concerns focus:**
> You are the doc-writer with focus: concerns.
> Explore the codebase and write CONCERNS.md to .tff/docs/CONCERNS.md.
> Follow your agent definition at @agents/tff-doc-writer.md.

### 3. Generate conventions doc

After all agents complete, spawn one more **tff-doc-writer** agent:

> You are the doc-writer. Read the ARCHITECTURE.md and STACK.md in .tff/docs/.
> Based on the patterns found, write CONVENTIONS.md to .tff/docs/CONVENTIONS.md.
> Document: naming patterns, import organization, error handling, test structure, function design.
> Follow your agent definition at @agents/tff-doc-writer.md.

### 4. Commit docs

```bash
git add .tff/docs/
git commit -m "docs: map codebase — STACK.md, ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md"
```

### 5. Summary

Show the user what was generated:
- `.tff/docs/STACK.md` — technology stack and integrations
- `.tff/docs/ARCHITECTURE.md` — system design and structure
- `.tff/docs/CONCERNS.md` — tech debt, risks, and gaps
- `.tff/docs/CONVENTIONS.md` — coding standards and patterns

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
