# Skill Auto-Learn Pipeline — Design Spec

**Date:** 2026-03-21
**Author:** MonsieurBarti + Claude
**Status:** Approved

---

## Overview

The Skill Auto-Learn Pipeline extends tff with the ability to observe agent tool usage across sessions, detect recurring patterns, suggest new skills, refine existing ones from user corrections, and compose skill clusters into bundles or specialized agents.

The pipeline follows a 6-stage lifecycle: **Observe → Detect → Suggest → Create → Learn → Compose**.

---

## Architecture

### Approach: Staged Pipeline (Approach B)

Each stage is a separate CLI command and application service following the existing hexagonal pattern. The observation hook is minimal (synchronous JSONL append). Pattern detection, aggregation, and ranking are deterministic TypeScript. Only skill drafting uses an LLM agent.

### Key Constraints

- Observation is **off by default** — opt-in via `.tff/settings.yaml`
- Human confirms **every** skill creation, refinement, and composition
- tff **never merges** — all reviews via plannotator, user approves
- The PostToolUse hook is **bulletproof** — synchronous file append, no stdin, no async, no network

---

## Stage 1: Observation Layer

### PostToolUse Hook

File: `hooks/tff-observe.js`

Fires after every tool use. Checks if observation is enabled, then appends one JSON line to `.tff/observations/sessions.jsonl`.

```javascript
#!/usr/bin/env node
'use strict';
try {
  const fs = require('fs');
  // Check if observation is enabled
  try {
    const yaml = fs.readFileSync('.tff/settings.yaml', 'utf8');
    if (!yaml.includes('enabled: true')) process.exit(0);
  } catch { process.exit(0); }

  // Read hook event from stdin (synchronous, non-blocking)
  let input = '';
  try { input = fs.readFileSync('/dev/stdin', 'utf8'); } catch { process.exit(0); }
  if (!input) process.exit(0);

  const data = JSON.parse(input);
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    tool: data.tool_name || 'unknown',
    args: data.tool_input?.command || data.tool_input?.file_path || null,
    project: process.cwd(),
  });

  fs.mkdirSync('.tff/observations', { recursive: true });
  fs.appendFileSync('.tff/observations/sessions.jsonl', line + '\n');
} catch { /* hooks must never block */ }
```

### Activation Control

In `.tff/settings.yaml`:
```yaml
observation:
  enabled: false    # default: off
```

Toggle via `/tff:settings` → "Enable observation" → sets `enabled: true` and creates `.tff/observations/`.

### Storage Format

```
.tff/
  observations/
    sessions.jsonl              ← raw tool-use log (append-only)
    patterns.jsonl              ← aggregated patterns (written by detect)
    candidates.jsonl            ← ranked candidates (written by rank)
    skill-history/              ← original versions for rollback
  drafts/                       ← pending skill drafts for review
```

### Observation Record Schema

```typescript
const ObservationSchema = z.object({
  ts: z.string(),           // ISO timestamp
  tool: z.string(),         // Tool name: Read, Write, Edit, Bash, Grep, Glob, Agent
  args: z.string().nullable(), // Command or file path (null if not applicable)
  project: z.string(),      // Working directory
});
```

---

## Stage 2: Pattern Detection

Triggered by `/tff:detect-patterns`. Three sub-stages run sequentially.

### Stage 2a: Extract N-grams

CLI: `tff-tools.cjs patterns:extract`

Reads `sessions.jsonl`, extracts:
- **Tool bigrams**: consecutive pairs (e.g., `Read→Grep`)
- **Tool trigrams**: consecutive triples (e.g., `Read→Grep→Edit`)
- **Bash command categories**: git-workflow, test-command, build-command, lint-command
- **File extension patterns**: which file types are touched together
- **Project distribution**: which projects each pattern appears in

Output: intermediate data passed to aggregate stage.

### Stage 2b: Aggregate + Filter

CLI: `tff-tools.cjs patterns:aggregate`

Groups n-grams by sequence, counts frequencies. Filters:
- **Framework noise**: patterns in 80%+ of sessions (too generic, e.g., `Read→Read`)
- **Singletons**: patterns appearing only once
- **Minimum threshold**: 3+ occurrences required

Output → `patterns.jsonl`:
```json
{"pattern":["Read","Grep","Edit","Bash(npm test)"],"count":12,"sessions":8,"projects":3,"lastSeen":"2026-03-21"}
```

### Stage 2c: Rank Candidates

CLI: `tff-tools.cjs patterns:rank`

Scores each pattern using weighted factors:

| Factor | Weight | Formula |
|---|---|---|
| Frequency | 0.25 | `log2(count+1) / 10`, capped at 1.0 |
| Cross-project breadth | 0.30 | `projectCount / totalProjects` |
| Recency | 0.25 | Exponential decay, 14-day half-life |
| Consistency | 0.20 | `sessionCount / totalSessions` |

Filters candidates above threshold (default 0.5).

Output → `candidates.jsonl`:
```json
{"pattern":["Read","Grep","Edit","Bash(npm test)"],"score":0.78,"evidence":{"count":12,"sessions":8,"projects":3}}
```

All three sub-stages are **deterministic TypeScript** — no LLM needed.

---

## Stage 3: Suggest

Command: `/tff:suggest-skills`

Reads `candidates.jsonl` and presents ranked candidates to the user:

```
Detected patterns:

1. [0.78] Read → Grep → Edit → Bash(npm test)
   12 occurrences, 8 sessions, 3 projects
   Looks like: TDD workflow — find code, edit, run tests

2. [0.65] Bash(git add) → Bash(git commit)
   25 occurrences, 15 sessions, 5 projects
   Looks like: atomic commit workflow

Create a skill from any of these? (1/2/skip)
```

The "Looks like" summary is generated by spawning the `tff-skill-drafter` agent with just the pattern evidence — a single-sentence summary call.

---

## Stage 4: Create

Command: `/tff:create-skill <candidate-number|description>`

### Skill Drafter Agent

New agent: `agents/tff-skill-drafter.md`

Receives:
- Pattern evidence (tool sequence, frequencies, projects)
- Existing skill files as examples (reads `skills/*.md`)
- Skill format requirements

Produces a complete skill markdown file:

```markdown
---
name: tdd-workflow
description: Use when implementing features with test-driven development
---

# TDD Workflow

## When to Use
- Implementing new features with existing test infrastructure
- Fixing bugs where regression tests should be added

## Workflow Steps
1. **Read** existing code and test patterns
2. **Grep** for related test files and patterns
3. **Edit** test file with failing test
4. **Run** `npm test` to verify failure
5. **Edit** implementation to make test pass
6. **Run** `npm test` to verify success

## Anti-Patterns
- Writing implementation before the test
- Running tests only at the end

## Evidence
| Metric | Value |
|---|---|
| Occurrences | 12 |
| Sessions | 8 |
| Projects | 3 |
| Confidence | 0.78 |
```

### Validation

Before saving, the tooling validates:
- **Name format**: 1-64 chars, lowercase letters/numbers/hyphens, no leading/trailing/consecutive hyphens
- **Description quality**: must start with "Use when" or contain activation triggers
- **Conflict detection**: Jaccard similarity check on keywords against existing skills
- **Safety**: no dangerous commands (recursive deletion, sudo, piped downloads)

### Review via Plannotator

Draft saved to `.tff/drafts/<skill-name>.md`. User reviews:

```bash
plannotator annotate .tff/drafts/tdd-workflow.md
```

- Approved → moves to `skills/<skill-name>.md`
- Rejected → deleted from drafts

---

## Stage 5: Learn (Skill Refinement)

Command: `/tff:learn`

### Correction Detection

Compares actual tool sequences (from `sessions.jsonl`) against loaded skill workflows. When a user consistently diverges from a skill's recommended pattern (3+ times), a refinement candidate surfaces.

### Bounded Refinement Rules

| Constraint | Value | Purpose |
|---|---|---|
| Min corrections before refine | 3 | Avoid reacting to one-off deviations |
| Max change per refinement | 20% of content | Prevent wholesale rewrites |
| Max cumulative drift | 60% from original | Preserve skill identity |
| Cooldown between refinements | 7 days | Avoid churn |
| User confirmation | Always | Human in the loop |

### Process

1. `/tff:learn` reads `sessions.jsonl` + `skills/*.md`
2. `tff-tools.cjs skills:drift` compares actual behavior vs skill workflows
3. Identifies consistent divergences (3+ occurrences)
4. Spawns `tff-skill-drafter` with original skill + divergence evidence
5. Agent proposes a bounded diff (not a full rewrite)
6. User reviews via plannotator
7. Approved → update skill, archive original to `.tff/observations/skill-history/<name>.v<N>.md`
8. Rejected → record as intentional divergence (don't suggest again)

### Drift Tracking

Each skill gets a drift score: `totalChanges / originalLength`. If it exceeds 60%, the system warns that the skill has drifted significantly and suggests creating a new skill instead.

---

## Stage 6: Compose

Command: `/tff:compose`

### Co-Activation Detection

CLI: `tff-tools.cjs compose:detect`

From `sessions.jsonl`, tracks which skills are referenced together. Skills that co-activate in 70%+ of their appearances form a cluster.

### Bundle vs Agent Decision

The `tff-skill-drafter` agent reads the cluster and decides:

**Bundle** — when the cluster is purely "how to do things" (no distinct persona):

```markdown
---
name: backend-workflow
description: Use when implementing backend features — combines hexagonal architecture, TDD, and commit conventions
---

# Backend Workflow

Load these skills together:
- @skills/hexagonal-architecture.md
- @skills/test-driven-development.md
- @skills/commit-conventions.md

## When to Use
- Backend feature implementation
- API endpoint development
```

**Agent** — when the cluster implies a "who" (a role with a persona):

```markdown
---
name: tff-backend-specialist
description: Specialized backend agent with proven workflow patterns
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are a Backend Specialist — a backend-dev with proven workflow patterns baked in.

## Skills
- @skills/hexagonal-architecture.md
- @skills/test-driven-development.md
- @skills/commit-conventions.md

[... persona, process, deliverables ...]
```

### Process

1. `/tff:compose` reads co-activation data
2. `tff-tools.cjs compose:detect` identifies clusters (70%+ threshold)
3. Spawns `tff-skill-drafter` with cluster data + existing agents as examples
4. Agent decides bundle vs agent, drafts the file
5. User reviews via plannotator
6. Approved → saved to `skills/` (bundle) or `agents/` (agent)
7. Rejected → recorded, don't suggest again

---

## New Commands

| Command | Purpose |
|---|---|
| `/tff:detect-patterns` | Extract, aggregate, and rank patterns from observations |
| `/tff:suggest-skills` | Show ranked candidates with summaries |
| `/tff:create-skill` | Draft a skill from a candidate or description |
| `/tff:learn` | Detect corrections, propose skill refinements |
| `/tff:compose` | Detect skill clusters, propose bundles or agents |

## New Agent

| Agent | Purpose |
|---|---|
| `tff-skill-drafter` | Drafts skill files, refinement diffs, bundles, and agent proposals from pattern evidence |

## New CLI Commands (tff-tools.cjs)

| Command | Layer | Purpose |
|---|---|---|
| `observe:record` | Infra | Append observation (called by hook) |
| `patterns:extract` | App | Extract n-grams from sessions.jsonl |
| `patterns:aggregate` | App | Aggregate + filter patterns |
| `patterns:rank` | App | Score and rank candidates |
| `compose:detect` | App | Detect skill co-activation clusters |
| `skills:drift` | App | Check drift scores for existing skills |
| `skills:validate` | App | Validate skill file format |

## File Structure

```
.tff/
  observations/
    sessions.jsonl
    patterns.jsonl
    candidates.jsonl
    skill-history/
  drafts/

hooks/
  tff-observe.js
  hooks.json

tools/src/
  domain/
    value-objects/
      observation.ts
      pattern.ts
      candidate.ts
  application/
    observe/
      record-observation.ts + spec
    patterns/
      extract-ngrams.ts + spec
      aggregate-patterns.ts + spec
      rank-candidates.ts + spec
    compose/
      detect-clusters.ts + spec
    skills/
      check-drift.ts + spec
      validate-skill.ts + spec

agents/
  tff-skill-drafter.md

workflows/
  detect-patterns.md
  suggest-skills.md
  create-skill.md
  learn-skills.md
  compose-skills.md

commands/tff/
  detect-patterns.md
  suggest-skills.md
  create-skill.md
  learn.md
  compose.md
```

## Hexagonal Architecture

- **Domain**: `Observation`, `Pattern`, `Candidate` value objects with Zod schemas
- **Application**: each pipeline stage is a service returning `Result<T, E>`
- **Infrastructure**: JSONL read/write adapter (implements a `ObservationStore` port)
- **CLI**: commands wire adapters to services
- **Tests**: colocated `.spec.ts`, in-memory observation store for unit tests
