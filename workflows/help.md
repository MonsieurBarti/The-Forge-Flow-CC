# Help

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Display tff command reference:

### Project Lifecycle
| Command | Description |
|---|---|
| `/tff:new` | Initialize new tff project |
| `/tff:new-milestone` | Start new milestone |
| `/tff:progress` | Show status dashboard |

### Slice Lifecycle
| Command | Description |
|---|---|
| `/tff:discuss` | Brainstorm and scope a slice |
| `/tff:research [slice-id]` | Research phase |
| `/tff:plan [slice-id]` | Plan and create tasks |
| `/tff:execute [slice-id]` | Execute with wave parallelism |
| `/tff:verify [slice-id]` | Verify acceptance criteria |
| `/tff:ship [slice-id]` | PR review and create slice PR |

### Milestone Lifecycle
| Command | Description |
|---|---|
| `/tff:audit-milestone` | Audit against original intent |
| `/tff:complete-milestone` | PR review and create milestone PR |

### Management
| Command | Description |
|---|---|
| `/tff:add-slice` | Add slice to milestone |
| `/tff:insert-slice` | Insert between slices |
| `/tff:remove-slice` | Remove future slice |
| `/tff:rollback [slice-id]` | Revert slice commits |
| `/tff:pause` | Save checkpoint |
| `/tff:resume` | Restore from checkpoint |
| `/tff:sync` | Regenerate STATE.md from SQLite |
| `/tff:health` | Diagnose state consistency |
| `/tff:settings` | Configure model profiles |
| `/tff:detect-patterns` | Extract and rank tool-use patterns |
| `/tff:suggest-skills` | Show pattern candidates with summaries |
| `/tff:create-skill` | Draft a skill from a pattern |
| `/tff:learn` | Propose refinements to existing skills |
| `/tff:compose` | Propose skill bundles or agents |
