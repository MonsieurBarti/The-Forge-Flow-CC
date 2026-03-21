# The Forge Flow — Design Spec

**Date:** 2026-03-21
**Author:** MonsieurBarti + Claude
**Status:** Approved

---

## Overview

The Forge Flow (`tff`) is a Claude Code plugin that orchestrates AI agents through a structured software development lifecycle. It coordinates specialized agents from project initialization to shipped code, using dual state (markdown + beads), plannotator for all reviews, and wave-based parallel execution.

It is built from scratch as a CC marketplace plugin, taking the best concepts from forgeflow and reimplementing them with a clean hexagonal architecture in the TypeScript tooling layer.

---

## Architecture

### Plugin Structure (Approach C — single package, TypeScript tooling compiled in-place)

```
the-forge-flow/
  .claude-plugin/
    plugin.json               ← plugin metadata
    marketplace.json          ← marketplace registry

  commands/tff/               ← PRESENTATION: CC slash commands (.md)
  agents/                     ← PRESENTATION: agent definitions (.md)
  workflows/                  ← PRESENTATION: orchestration logic (.md)
  references/                 ← conventions, templates (.md)
  hooks/                      ← PRESENTATION: JS hooks

  tools/
    src/
      domain/                 ← DOMAIN (zero infra imports, only Zod + node:crypto)
        entities/
          project.ts          ← aggregate root (singleton per repo)
          milestone.ts        ← aggregate root
          slice.ts            ← aggregate root
          task.ts             ← aggregate root
        value-objects/
          complexity-tier.ts      ← S / F-lite / F-full
          slice-status.ts         ← state machine transitions
          commit-ref.ts
          sync-report.ts
          wave.ts
        ports/
          bead-store.port.ts      ← interface for beads operations
          artifact-store.port.ts  ← interface for markdown read/write
          git-ops.port.ts         ← interface for git/worktree ops
          review-store.port.ts    ← interface for review metadata tracking
        events/
          slice-planned.event.ts
          task-completed.event.ts
          sync-conflict.event.ts
        errors/
          project-exists.error.ts
          invalid-transition.error.ts
          sync-conflict.error.ts
          fresh-reviewer-violation.error.ts
        result.ts                 ← Result<T, E>, Ok, Err

      application/            ← APPLICATION (orchestrates domain, returns Result)
        sync/
          reconcile-state.ts      ← md ↔ beads sync logic
        waves/
          detect-waves.ts         ← topological sort from bead deps
        lifecycle/
          transition-slice.ts     ← state machine transitions
          classify-complexity.ts  ← auto-classify S/F-lite/F-full
        review/
          enforce-fresh-reviewer.ts
        project/
          init-project.ts         ← singleton enforcement

      infrastructure/         ← INFRASTRUCTURE (adapters)
        adapters/
          beads/
            bd-cli.adapter.ts         ← implements bead-store.port
          filesystem/
            markdown-artifact.adapter.ts  ← implements artifact-store.port
          git/
            git-cli.adapter.ts        ← implements git-ops.port
            worktree.adapter.ts
          review/
            review-metadata.adapter.ts  ← implements review-store.port

        cli/                  ← PRESENTATION (within tools)
          index.ts            ← entry point, command router
          commands/           ← CLI subcommands

    dist/tff-tools.cjs        ← compiled single-file bundle
    tsconfig.json
    vitest.config.ts

  package.json
```

### Hexagonal Rules

- **Domain layer**: imports only Zod, `node:crypto`, Result. No infrastructure.
- **Zod as single source of truth**: `z.infer<typeof Schema>` everywhere. No TS `enum` — use `z.enum()`.
- **Result<T, E>**: all operations that can fail. Never throw from domain or application.
- **Ports**: interfaces in domain layer. Adapters implement them in infrastructure.
- **Tests**: colocated `.spec.ts` files. Unit tests use in-memory adapters. Integration tests use real `bd`/`git`/filesystem.
- **Test framework**: Vitest, `describe`/`it`/`expect` — no `test()` alias.
- **TDD**: RED → GREEN → REFACTOR.

### Layer Communication

1. **Markdown commands** (outermost) call `node tff-tools.cjs <command>` via Bash
2. **CLI entry point** parses args, wires adapters to ports, calls application layer
3. **Application layer** orchestrates domain entities through ports
4. **Domain layer** owns invariants — state machine, sync conflict detection, complexity classification
5. **Infrastructure adapters** shell out to `bd` CLI, `git` CLI, filesystem

All CLI commands return JSON to stdout:
- Success: `{ "ok": true, "data": ... }`
- Failure: `{ "ok": false, "error": { "code": "...", "message": "..." } }`

---

## Distribution & Installation

### CC Marketplace

**plugin.json:**
```json
{
  "name": "the-forge-flow",
  "description": "Autonomous coding agent orchestrator with dual markdown+beads state, plannotator integration, and wave-based parallel execution",
  "version": "0.1.0",
  "author": { "name": "MonsieurBarti" },
  "repository": "https://github.com/MonsieurBarti/the-forge-flow",
  "keywords": ["orchestration", "beads", "plannotator", "agents", "tdd"]
}
```

**Installation:**
```
claude /plugin marketplace add MonsieurBarti/the-forge-flow
claude /plugin install the-forge-flow@the-forge-flow
```

The repo ships `tools/dist/tff-tools.cjs` pre-compiled. No build step for end users.

### Dependency Bootstrap (SessionStart hook)

```
SessionStart hook fires
  → check `bd --version`
    → found: continue silently
    → not found:
        → check if npm is available
          → yes: prompt "beads CLI not found. Install? (npm install -g @beads/bd)"
            → approved: run install, verify
            → denied: print install instructions, block tff commands
          → no npm: print manual install instructions
  → check plannotator installed
    → found: continue
    → not found: print install instructions for plannotator CC plugin
```

---

## Work Hierarchy & State Model

### Hierarchy

Milestone → Slice → Task

### Bead Labels

| Concept | Bead Label | Parent |
|---|---|---|
| Project | `tff:project` | — |
| Milestone | `tff:milestone` | project |
| Slice | `tff:slice` | milestone |
| Requirement | `tff:req` | milestone |
| Task | `tff:task` | slice |
| Research | `tff:research` | slice |

### Singleton Project Enforcement

One `tff` project per git repo. Enforced at two levels:
1. **Domain layer**: `init-project.ts` checks for existing `tff:project` bead and `.tff/PROJECT.md`. Returns `Err('PROJECT_EXISTS')` if either exists.
2. **`/tff:new` command**: checks result, redirects to `/tff:new-milestone` if project exists.

### Dual State

| Data | Markdown (`.tff/`) | Beads |
|---|---|---|
| Project vision, description | `PROJECT.md` | `tff:project` design field |
| Requirements content | `REQUIREMENTS.md` | `tff:req` design field |
| Slice plan, acceptance criteria | `slices/M01-S01/PLAN.md` | `tff:slice` design field |
| Research notes | `slices/M01-S01/RESEARCH.md` | `tff:research` design field |
| Task descriptions | Within `PLAN.md` | `tff:task` design field |
| Status | Derived in `STATE.md` | **Beads is source of truth** |
| Dependencies | Annotations in PLAN.md | **Beads is source of truth** |
| Assignment | — | **Beads only** |

### Conflict Resolution

- Content: markdown wins → update bead design field
- Status: beads wins → update STATE.md
- `STATE.md` is always derived, never hand-edited

### Project Directory

```
.tff/
  PROJECT.md
  REQUIREMENTS.md
  STATE.md                      ← derived, never edited
  settings.yaml                 ← model profiles, quality gate config
  worktrees/
    M01-S01/                    ← git worktree per slice
    M01-S02/
  slices/
    M01-S01/
      PLAN.md
      RESEARCH.md
      CHECKPOINT.md             ← resumability
    M01-S02/
      PLAN.md
```

---

## Lifecycle State Machine

### Slice States

```
discussing ──auto──→ researching ──auto──→ planning
                                              │
                                    ┌─────────┘
                                    ▼
                              plan-review (plannotator)
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                         approved        revise ──→ planning (loop)
                            │
                            ▼
                         executing
                            │
                      ┌─────┴─────┐
                      ▼           ▼
                  wave N      wave N+1 ... (sequential waves, parallel tasks within)
                      │
                      ▼
                   verifying
                      │
                ┌─────┴─────┐
                ▼           ▼
             passed      failed ──→ executing (replan loop)
                │
                ▼
          slice PR review (plannotator)
                │
          ┌─────┴─────┐
          ▼           ▼
       approved    changes ──→ executing (fix loop)
          │
          ▼
       slice closed (merge to milestone branch)
```

All slices closed → milestone PR review → merge to main → milestone closed.

### Human Gates

- Plan approval (via plannotator annotation)
- Replan approval (if verification fails)
- Slice PR review (slice branch → milestone branch)
- Milestone PR review (milestone branch → main)

### Auto-Continues

- discussing → researching
- researching → planning
- verifying → completing (if passed)

### Complexity Tiers

Auto-classified by tooling, user-overridable via `--tier`.

| Tier | Brainstormer | Research | Plan Review | Fresh Reviewer | Waves | TDD |
|---|---|---|---|---|---|---|
| S (quick fix) | Skip | Skip | Plannotator | Always | Single | Skip |
| F-lite (feature) | Yes | Optional | Plannotator | Always | Auto-detect | Yes |
| F-full (complex) | Yes | Required | Plannotator | Always, multi-agent | Auto-detect | Yes |

Classification heuristic: initially set during discussing phase based on user description and scope signals (number of modules affected, external integrations, unknowns surfaced by brainstormer). Can be re-classified after planning if task decomposition reveals different complexity. User can override at any point via `--tier`. Stored as `ComplexityTier` value object.

---

## Agent Roles

### V1 Agent Set (10 roles)

**Strategy agents** (planning & design):

| Agent | File | Purpose | Spawned during |
|---|---|---|---|
| brainstormer | `tff-brainstormer.md` | Challenge assumptions, surface unknowns, lock scope | discussing |
| architect | `tff-architect.md` | Architecture decisions, module boundaries | planning, slice PR review |
| product-lead | `tff-product-lead.md` | Requirements validation, acceptance criteria | discussing, verifying |

**Domain agents** (code writers):

| Agent | File | Purpose | Spawned during |
|---|---|---|---|
| frontend-dev | `tff-frontend-dev.md` | UI code | executing |
| backend-dev | `tff-backend-dev.md` | API, services, domain logic | executing |
| devops | `tff-devops.md` | CI/CD, infrastructure | executing |

**Quality agents** (verification):

| Agent | File | Purpose | Spawned during |
|---|---|---|---|
| tester | `tff-tester.md` | Writes failing `.spec.ts` before domain agent implements | executing (before domain agent) |
| fixer | `tff-fixer.md` | Applies accepted review findings | after PR review |
| security-auditor | `tff-security-auditor.md` | Security review on every PR | slice PR, milestone PR |
| code-reviewer | `tff-code-reviewer.md` | Code quality review | slice PR |

### Fresh Reviewer Enforcement

Domain rule, enforced by tooling:

1. During execution, `tff-tools.cjs` records which agent wrote code for each task (stored in bead metadata: `executor: backend-dev`)
2. At slice PR review, the workflow reads this metadata and ensures:
   - `tff-code-reviewer` is never the same agent type that wrote the code
   - `tff-security-auditor` is always spawned (never the author)
   - `tff-architect` reviews structural changes (never the author)
3. Violation returns `Err('FRESH_REVIEWER_VIOLATION')` and blocks the review

### Model Profiles

Configurable per project in `.tff/settings.yaml`:

```yaml
model-profiles:
  quality:    # brainstormer, architect, code-reviewer, security-auditor
    model: opus
  balanced:   # planner, product-lead, tester
    model: sonnet
  budget:     # executor agents, fixer
    model: sonnet
```

---

## Git Branch Model

### Branch Hierarchy

```
main (protected, PR-only)
  └── milestone/M01            ← created at new-milestone
        ├── slice/M01-S01      ← one worktree per slice
        ├── slice/M01-S02
        └── slice/M01-S03
```

### Worktree Lifecycle

1. `/tff:plan` creates slice bead → `tff-tools.cjs worktree:create M01-S01`
2. Branch `slice/M01-S01` created from `milestone/M01`
3. Worktree at `.tff/worktrees/M01-S01/`
4. All execution inside worktree — agents never touch main checkout
5. Slice PR approved → merge `slice/M01-S01` into `milestone/M01` → delete worktree
6. Milestone PR approved → merge `milestone/M01` into `main`

### Commit Conventions

| Type | Format | Example |
|---|---|---|
| Code | `<type>(S01/T03): <summary>` | `feat(S01/T03): add user validation` |
| Artifact | `docs(S01): <summary>` | `docs(S01): update PLAN.md with research` |
| Rollback | `revert(S01/T03): <summary>` | `revert(S01/T03): undo broken migration` |

Valid types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

### Rollback

- Before execution, tooling captures base commit SHA in `CHECKPOINT.md`
- On rollback: `git revert` on execution-generated commits only (not artifact commits)
- Per-slice, never affects other slices or milestone branch

---

## Beads ↔ Markdown Sync

### When Sync Happens

| Trigger | Direction | What syncs |
|---|---|---|
| Agent edits PLAN.md | md → beads | Task descriptions, acceptance criteria → bead design field |
| Agent calls `bd close <task>` | beads → md | STATE.md regenerated |
| `/tff:progress` called | beads → md | STATE.md regenerated |
| Slice status changes | beads → md | STATE.md regenerated |
| `/tff:sync` (manual) | bidirectional | Full reconciliation |

Sync is event-driven, not continuous.

### Reconciliation Algorithm

```
1. Load all beads for current milestone (bd list --label tff:*)
2. Load all markdown files from .tff/
3. For each entity (slice, task, req):
   a. If exists in beads but not markdown → generate markdown from bead
   b. If exists in markdown but not beads → create bead from markdown
   c. If exists in both:
      - Content: markdown wins → update bead design field
      - Status: beads wins → update STATE.md
      - Dependencies: beads wins → update PLAN.md annotations
4. Detect orphans (beads with no markdown counterpart)
   → warn, don't delete
```

### STATE.md (always derived)

```markdown
# State — Milestone M01

## Progress
- Slices: 2/5 completed
- Tasks: 12/28 completed
- Requirements coverage: 8/10 validated

## Slices
| Slice | Status | Tasks | Progress |
|---|---|---|---|
| M01-S01 | closed | 6/6 | 100% |
| M01-S02 | executing | 3/8 | 37% |
| M01-S03 | planning | 0/5 | 0% |
```

No silent data loss. Every conflict logged in sync report. Orphans warn, never auto-delete.

---

## Plannotator Integration

### Three Integration Points

**1. Plan review** (after planning):
- Workflow generates `PLAN.md`
- Agent calls `plannotator annotate .tff/slices/M01-S01/PLAN.md`
- User annotates in browser → feedback returns → agent revises → loop until approved

**2. Verification findings review** (after verifying):
- Verifier produces `VERIFICATION.md`
- Agent calls `plannotator annotate .tff/slices/M01-S01/VERIFICATION.md`
- User marks findings as fix/accept → fixer agent spawned for fixes

**3. Slice PR code review:**
- Agent calls `plannotator review` on slice worktree
- User annotates code changes → fixer agent applies changes

### Invocation

Commands use `allowed-tools: Bash(plannotator:*)` in frontmatter. Plannotator CLI called directly from workflow markdown. The TypeScript `review-store.port` tracks review metadata in beads (who reviewed, outcome, date) for fresh-reviewer enforcement — it does not invoke plannotator itself.

---

## Wave Parallelism & Execution

### Wave Detection

`tff-tools.cjs waves:detect --slice M01-S01` reads bead dependencies, runs topological sort:

```
Wave 1: [T01, T02, T03]    ← no dependencies, parallel
Wave 2: [T04, T05]          ← depend on wave 1
Wave 3: [T06]               ← depends on wave 2
```

### Execution Flow Per Wave

```
For each wave:
  1. Save checkpoint (wave number, completed tasks, base commit)
  2. For each task in wave (parallel):
     a. Spawn tff-executor agent in slice worktree
     b. Agent claims task (bd update --status in_progress)
     c. For F-lite/F-full: tff-tester writes failing spec first
     d. Domain agent implements (backend-dev, frontend-dev, or devops)
     e. Agent commits: feat(S01/T03): <summary>
     f. Agent signals completion (bd close)
  3. Wait for all tasks in wave
  4. Sync state (beads → STATE.md)
  5. If quality gate enabled: spawn security-auditor + architect in parallel
  6. Next wave
```

### Checkpoint & Resumability

`CHECKPOINT.md` per slice:
```markdown
# Checkpoint — M01-S01
- Base commit: abc123
- Current wave: 2
- Completed waves: [1]
- Completed tasks: [T01, T02, T03]
- Executor log: backend-dev→T01, frontend-dev→T02, backend-dev→T03
```

`/tff:pause` saves checkpoint. `/tff:resume` reads it, skips completed waves, continues.

### TDD Enforcement

For F-lite and F-full tiers:
1. `tff-tester` spawns, reads task acceptance criteria
2. Writes failing `.spec.ts`, commits: `test(S01/T03): add failing spec`
3. Domain agent implements until specs pass
4. S-tier: TDD skipped

---

## Commands

### V1 Command Set (20 commands)

**Project lifecycle:**

| Command | Purpose |
|---|---|
| `/tff:new` | Init project. Blocks if project exists → redirects to `/tff:new-milestone` |
| `/tff:new-milestone` | Start new milestone cycle |
| `/tff:progress` | Status dashboard, syncs STATE.md |

**Slice lifecycle:**

| Command | Purpose |
|---|---|
| `/tff:discuss` | Brainstormer challenges scope, surfaces unknowns |
| `/tff:research [slice-id]` | Research phase for slice N |
| `/tff:plan [slice-id]` | Plan slice, plannotator review |
| `/tff:execute [slice-id]` | Wave-based execution with TDD |
| `/tff:verify [slice-id]` | UAT verification, findings via plannotator |
| `/tff:ship [slice-id]` | Slice PR → plannotator code review → merge to milestone |

**Milestone lifecycle:**

| Command | Purpose |
|---|---|
| `/tff:audit-milestone` | Audit completion against original intent |
| `/tff:complete-milestone` | Milestone PR → review → merge to main |

**Management:**

| Command | Purpose |
|---|---|
| `/tff:add-slice` | Add slice to current milestone |
| `/tff:insert-slice` | Insert between existing slices |
| `/tff:remove-slice` | Remove future slice, renumber |
| `/tff:rollback [slice-id]` | Revert execution commits for slice N |
| `/tff:pause` | Save checkpoint |
| `/tff:resume` | Restore from checkpoint |
| `/tff:sync` | Manual bidirectional md ↔ beads reconciliation |
| `/tff:health` | Diagnose state consistency |
| `/tff:settings` | Configure model profiles, quality gates |
| `/tff:help` | List commands and usage |

### Command Structure

Each command is a thin `.md` file:
```markdown
---
name: tff:<name>
description: <purpose>
argument-hint: "[args]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent
---

<objective>
What this command achieves.
</objective>

<context>
Read conventions: @~/.claude/plugins/.../references/conventions.md
</context>

<execution_context>
Execute workflow from @~/.claude/plugins/.../workflows/<workflow>.md
</execution_context>
```

---

## Tooling CLI Commands

All called via `node tff-tools.cjs <command>`. All return JSON to stdout.

**Project:**

| Command | Returns |
|---|---|
| `project:init <name>` | Creates project bead + `.tff/`. `Err('PROJECT_EXISTS')` if exists |
| `project:get` | Project bead data |

**Milestone:**

| Command | Returns |
|---|---|
| `milestone:create <name>` | Creates milestone bead + branch |
| `milestone:list` | All milestones with status |

**Slice:**

| Command | Returns |
|---|---|
| `slice:create <milestone> <name>` | Creates slice bead + worktree + branch |
| `slice:transition <id> <status>` | Validates state machine, transitions |
| `slice:classify <id>` | Returns complexity tier |

**Waves:**

| Command | Returns |
|---|---|
| `waves:detect <slice-id>` | JSON array of waves with task IDs |

**Sync:**

| Command | Returns |
|---|---|
| `sync:reconcile [--milestone M01]` | Full reconciliation, returns SyncReport |
| `sync:state [--milestone M01]` | Regenerates STATE.md |

**Git:**

| Command | Returns |
|---|---|
| `worktree:create <slice-id>` | Creates worktree at `.tff/worktrees/` |
| `worktree:delete <slice-id>` | Removes worktree + branch |
| `worktree:list` | All active worktrees |

**Review:**

| Command | Returns |
|---|---|
| `review:record <slice-id> <agent> <status>` | Stores review metadata in bead |
| `review:check-fresh <slice-id> <agent>` | `Ok` or `Err('FRESH_REVIEWER_VIOLATION')` |

**Checkpoint:**

| Command | Returns |
|---|---|
| `checkpoint:save <slice-id> <data>` | Writes CHECKPOINT.md + bead metadata |
| `checkpoint:load <slice-id>` | Returns checkpoint data |

---

## Deferred to Post-V1

- Skill auto-learn pipeline (observe → detect → suggest → generate → refine → compose)
- Doc-writer agent
