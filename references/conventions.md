# tff Conventions

## Bead Labels

| Concept | Label | Parent |
|---|---|---|
| Project | `tff:project` | — |
| Milestone | `tff:milestone` | project |
| Slice | `tff:slice` | milestone |
| Requirement | `tff:req` | milestone |
| Task | `tff:task` | slice |
| Research | `tff:research` | slice |

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
        ├── Requirements (tff:req)
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

## Dual State Rules

- Content changes: markdown wins → sync to bead design field
- Status changes: beads wins → regenerate STATE.md
- On conflict: beads status wins, markdown content wins
- STATE.md is always derived, never hand-edited

## Complexity Tiers

| Tier | Brainstormer | Research | TDD | Fresh Reviewer |
|---|---|---|---|---|
| S (quick fix) | Skip | Skip | Skip | Always |
| F-lite (feature) | Yes | Optional | Yes | Always |
| F-full (complex) | Yes | Required | Yes | Always, multi-agent |

## Beads Best Practices

### Task Claiming

Use `bd update <id> --claim` to atomically claim a task (sets assignee + status to in_progress). Never manually set status and assignee separately.

### Finding Ready Work

Use `bd ready --json` to list unblocked tasks. This respects the dependency graph — only tasks whose blockers are all resolved appear.

### Descriptions with Special Characters

Use `--stdin` for descriptions containing backticks, quotes, or special characters:
```bash
echo 'Description with `backticks` and "quotes"' | bd create "Title" --stdin
```

Or use `--body-file` for longer content:
```bash
bd create "Title" --body-file=description.md
```

### Closing with Reason

Always close with a reason:
```bash
bd close <id> --reason "Completed — all acceptance criteria met"
```

### Agent Session Pattern

```bash
# Claim task atomically
bd update <task-id> --claim

# Do the work...

# Close with reason
bd close <task-id> --reason "Completed"
```

## Tooling CLI

All tooling calls: `node <plugin-path>/tools/dist/tff-tools.cjs <command> [args]`

Returns JSON: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`
