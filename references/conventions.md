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
  REQUIREMENTS.md         ← requirements content
  STATE.md                ← DERIVED, never edit manually
  settings.yaml           ← model profiles, quality gates
  slices/
    M01-S01/
      PLAN.md             ← slice plan and task descriptions
      RESEARCH.md         ← research notes
      CHECKPOINT.md       ← resumability data
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

## Tooling CLI

All tooling calls: `node <plugin-path>/tools/dist/tff-tools.cjs <command> [args]`

Returns JSON: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`
