# tff Conventions

## Entity Types

| Entity | Description |
|---|---|
| Project | Top-level singleton |
| Milestone | Versioned delivery unit |
| Slice | Scoped unit of work within a milestone |
| Task | Atomic work item within a slice |
| Requirement | Acceptance criterion scoped to a milestone |

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

These transitions require explicit human approval:
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

- Milestone numbers: `M01`, `M02`, ...
- Slice IDs: `M01-S01`, `M01-S02`, ...
- Task refs: `T01`, `T02`, ...
- Branches: `milestone/M01`, `slice/M01-S01`

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

- State is managed by SQLite via tff-tools
- STATE.md is always derived, never hand-edited
- tff-tools is the single source of truth for status ∧ dependencies

## Complexity Tiers

Classification happens at end of discuss. User confirms the tier — ¬ auto-routing.

**S-tier criteria (ALL must be true):** ≤1 file affected, 0 new files, ¬ investigation needed, ¬ architecture impact, 0 unknowns.

All tiers follow the same pipeline. Tiers control **depth**, ¬ which steps run.

| Tier | Discuss | Research | Plan Review | Execute | Code Review |
|---|---|---|---|---|---|
| S (single-file fix) | Lightweight | Skip | Plannotator | No TDD | Agent-only |
| F-lite (default) | Full | Optional | Plannotator | TDD | Agent-only |
| F-full (complex) | Full + brainstormer | Required | Plannotator | TDD | Agent-only, multi-reviewer |

## tff-tools Patterns

### Task Claiming

Use `tff-tools task:claim <id>` to atomically claim a task (sets assignee + status to in_progress).

### Adding Dependencies

Use `tff-tools dep:add <from-id> <to-id>` to create blocking dependencies between slices ∨ tasks.
This means `<from-id>` depends on (is blocked by) `<to-id>`.

### Finding Ready Work

Use `tff-tools task:ready` to list unblocked tasks. This respects the dependency graph — only tasks whose blockers are all resolved appear.

### Closing with Reason

Always close with a reason:
```bash
tff-tools slice:close <id> --reason "Completed — all acceptance criteria met"
```

### Agent Session Pattern

```bash
# Claim task atomically
tff-tools task:claim <task-id>

# Do the work...

# Close with reason
tff-tools task:close <task-id> --reason "Completed"
```

## Tooling CLI

All tooling calls: `node <plugin-path>/dist/cli/index.js <command> [args]`

Returns JSON: `{ "ok": true, "data": ... }` ∨ `{ "ok": false, "error": { "code": "...", "message": "..." } }`
