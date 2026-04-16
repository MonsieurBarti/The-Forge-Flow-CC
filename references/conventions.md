# tff Conventions

## Entity Types

| Entity | Description |
|---|---|
| Project | Top-level singleton |
| Milestone | Versioned delivery unit |
| Slice | Scoped work unit ∈ milestone |
| Task | Atomic work item ∈ slice |
| Requirement | AC scoped to milestone |

## Status Flow

Items progress: `open` → `in_progress` → `closed`

### Slice States

```
discussing → researching → planning → executing → verifying → reviewing → completing → closed
```

Back-edges (loops):
- `planning → planning` (revision after plannotator feedback)
- `verifying → executing` (replan after verification failure)
- `reviewing → executing` (fix after PR review changes requested)

### Human Gates

Transitions requiring explicit human approval:
- Plan approval (via plannotator annotation on PLAN.md)
- Replan approval (if verification fails)
- Slice PR review (slice branch → milestone branch)
- Milestone PR review (milestone branch → main)

## Hierarchy

One project per repo (singleton enforcement).

```
Project
  └── Milestone (M01, M02, ...)
        ├── Requirements
        └── Slices (M01-S01, M01-S02, ...)
              └── Tasks (T01, T02, ...)
```

## Naming

- Milestone numbers: `M01`, `M02`, ... (human-readable labels)
- Slice IDs: `M01-S01`, `M01-S02`, ... (human-readable labels)
- Task refs: `T01`, `T02`, ... (local to slice)
- Branches:
  - Milestone: `milestone/<8hex>` (UUID prefix, e.g., `milestone/a1b2c3d4`)
  - Slice: `slice/<8hex>` (UUID prefix, e.g., `slice/12345678`)

**Note:** Entity IDs are UUIDs, not labels. Labels are computed from numbers for human readability. Branch names use the first 8 characters of the UUID for collision-safe naming.

## Commit Format

```
<type>(S01/T03): <summary>
```

Valid types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Special formats:
- Artifact: `docs(S01): <summary>`
- Rollback: `revert(S01/T03): <summary>`

## Project Directory

```
.tff/
  PROJECT.md              ← project vision (markdown-authoritative)
  STATE.md                ← DERIVED, never edit manually
  settings.yaml           ← model profiles, quality gates
  milestones/
    M01/
      REQUIREMENTS.md     ← requirements scoped to this milestone
      slices/
        M01-S01/
          SPEC.md         ← design spec (produced during discuss)
          PLAN.md         ← slice plan and task descriptions
          RESEARCH.md     ← research notes
          CHECKPOINT.md   ← resumability data
  worktrees/
    M01-S01/              ← git worktree (gitignored)
```

## State Rules

- State managed by SQLite via tff-tools
- STATE.md always derived, never hand-edited
- tff-tools = single source of truth for status ∧ dependencies

## Complexity Tiers

Classification at end of discuss. User confirms tier — ¬ auto-routing.

**S-tier criteria (ALL must be true):** ≤1 file affected, 0 new files, ¬ investigation needed, ¬ architecture impact, 0 unknowns.

All tiers follow same pipeline. Tiers control **depth**, ¬ which steps run.

| Tier | Discuss | Research | Plan Review | Execute | Code Review |
|---|---|---|---|---|---|
| S (single-file fix) | Lightweight | Skip | Plannotator | No TDD | Agent-only |
| F-lite (default) | Full | Optional | Plannotator | TDD | Agent-only |
| F-full (complex) | Full + brainstormer | Required | Plannotator | TDD | Agent-only, multi-reviewer |

## tff-tools Patterns

### Task Claiming

Use `tff-tools task:claim <id>` to atomically claim task (sets assignee + status → in_progress).

### Adding Dependencies

Use `tff-tools dep:add <from-id> <to-id>` to create blocking dependencies between slices ∨ tasks.
`<from-id>` depends on (blocked by) `<to-id>`.

### Finding Ready Work

Use `tff-tools task:ready` to list unblocked tasks. Respects dependency graph — only tasks whose blockers all resolved appear.

### Closing with Reason

Always close with reason:
```bash
tff-tools slice:close <id> --reason "Completed — all AC met"
```

### Agent Session Pattern

```bash
# Claim atomically
tff-tools task:claim <task-id>

# Do work...

# Close with reason
tff-tools task:close <task-id> --reason "Completed"
```

## Tooling CLI

All tooling calls: `node <plugin-path>/dist/cli/index.js <command> [args]`

Returns JSON: `{ "ok": true, "data": ... }` ∨ `{ "ok": false, "error": { "code": "...", "message": "..." } }`
