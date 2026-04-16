# Flag Naming Conventions

This document establishes the single source of truth for flag naming across all tff-tools CLI commands.

## Core Principles

1. **Flags-only syntax** — No positional arguments. Every parameter is passed via a named flag.
2. **Self-documenting names** — Flag names clearly indicate their purpose.
3. **Consistency** — Same concept uses the same flag name across all commands.

## Naming Rules

### Format

- **Kebab-case**: All flag names use lowercase with hyphens (e.g., `--slice-id`, `--base-commit`)
- **Double-dash prefix**: Flags always start with `--` (no single-dash shortcuts)

### Entity IDs

Always use the pattern `--<entity>-id`:

| Entity | Flag Name | Example Value |
|--------|-----------|---------------|
| Project | `--project-id` | `uuid-string` |
| Milestone | `--milestone-id` | `M01` |
| Slice | `--slice-id` | `M01-S01` |
| Task | `--task-id` | `T01` |

**Never** use generic names like `--id` or `--target-id`. Always be specific about which entity.

### Statuses

Always use `--status` for target status:

```bash
slice:transition --slice-id M01-S01 --status planning
```

**Never** use alternatives like:
- `--target-status`
- `--new-status`
- `--to-status`

### Boolean Flags

Boolean flags are presence-based (no value needed):

```bash
# Correct
project:get --json

# Incorrect
project:get --json true
```

Common boolean flags:

| Flag | Meaning |
|------|---------|
| `--json` | JSON output mode (for help/schema) |
| `--help` | Show command help |

### File Paths

Use `--file-path` for file system paths:

```bash
direct-edit:guard --file-path src/domain/slice.ts
```

### JSON Data

For structured data that cannot be expressed as simple flags:

| Flag | Purpose |
|------|---------|
| `--data` | Inline JSON string for complex input |
| `--tasks` | JSON array of task objects |
| `--signals` | JSON object for classification signals |

### Strings

Simple string values use descriptive names:

| Context | Flag Name | Example |
|---------|-----------|---------|
| Entity name | `--name` | `--name "My Project"` |
| Entity title | `--title` | `--title "Implement feature X"` |
| Reason/message | `--reason` | `--reason "Completed successfully"` |
| Vision | `--vision` | `--vision "Build the best tool"` |
| Agent name | `--agent` | `--agent "executor"` |
| Commit SHA | `--commit-sha` | `--commit-sha abc123` |

### Numbers

Use descriptive names:

| Context | Flag Name | Example |
|---------|-----------|---------|
| Wave number | `--current-wave` | `--current-wave 2` |
| Threshold | `--threshold` | `--threshold 0.5` |
| Count/limit | `--min-count` | `--min-count 2` |
| TTL | `--ttl-minutes` | `--ttl-minutes 60` |

### Arrays

JSON arrays for complex list data:

```bash
checkpoint:save --slice-id M01-S01 --base-commit abc123 --current-wave 1 --completed-waves '[0]' --completed-tasks '["T01","T02"]' --executor-log '[]'
```

## Reserved Flag Names

These flags have special meaning and should not be repurposed:

| Flag | Purpose |
|------|---------|
| `--help` | Show command help/usage |
| `--json` | JSON output mode (for help/schema) |

## Error Messages

When a flag error occurs, the error must include valid alternatives:

### Missing Required Flag

```json
{
  "ok": false,
  "error": {
    "code": "MISSING_REQUIRED_FLAG",
    "message": "Missing required flag: --status",
    "requiredFlags": ["--slice-id", "--status"],
    "missingFlag": "--status"
  }
}
```

### Unknown Flag

```json
{
  "ok": false,
  "error": {
    "code": "UNKNOWN_FLAG",
    "message": "Unknown flag: --target-status",
    "validFlags": ["--slice-id", "--status"]
  }
}
```

### Invalid Enum Value

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_ENUM_VALUE",
    "message": "Invalid value for --status: 'invalid'. Must be one of: discussing, researching, planning, executing, verifying, reviewing, shipping, closed",
    "flag": "--status",
    "provided": "invalid",
    "validValues": ["discussing", "researching", "planning", "executing", "verifying", "reviewing", "shipping", "closed"]
  }
}
```

## Command Categories

### Entity Operations

Commands that create, read, update, or delete entities:

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `project:init` | `--name` | `--vision` |
| `project:get` | none | none |
| `milestone:create` | `--name` | none |
| `milestone:list` | none | `--milestone-id` |
| `milestone:close` | `--milestone-id` | `--reason` |
| `slice:create` | `--title`, `--milestone-id` | none |
| `slice:list` | none | `--milestone-id` |
| `slice:transition` | `--slice-id`, `--status` | none |
| `slice:close` | `--slice-id` | `--reason` |
| `slice:classify` | `--signals` | none |
| `task:claim` | `--task-id` | `--claimed-by` |
| `task:close` | `--task-id` | `--reason` |
| `task:ready` | `--slice-id` | none |

### Dependencies

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `dep:add` | `--from-id`, `--to-id` | none |

### Guards

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `direct-edit:guard` | none | `--file-path` |
| `pre-op:guard` | `--slice-id`, `--operation` | none |
| `spec-edit:guard` | none | `--file-path` |

### Workflow

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `waves:detect` | `--tasks` | none |
| `sync:state` | `--milestone-id` | none |
| `workflow:next` | `--status` | none |
| `workflow:should-auto` | `--status`, `--mode` | none |

### Worktrees

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `worktree:create` | `--slice-id` | none |
| `worktree:delete` | `--slice-id` | none |
| `worktree:list` | none | none |

### Review

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `review:check-fresh` | `--slice-id`, `--agent` | none |
| `review:record` | `--slice-id`, `--agent`, `--verdict`, `--type`, `--commit-sha` | none |

### Checkpoint

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `checkpoint:save` | `--slice-id`, `--base-commit`, `--current-wave`, `--completed-waves`, `--completed-tasks`, `--executor-log` | none |
| `checkpoint:load` | `--slice-id` | none |

### Observation

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `observe:record` | `--ts`, `--session`, `--tool`, `--args`, `--project` | none |

### Patterns

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `patterns:extract` | none | none |
| `patterns:aggregate` | none | `--min-count` |
| `patterns:rank` | none | `--threshold` |

### Composition

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `compose:detect` | `--observations` | `--options` |

### Skills

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `skills:drift` | `--original`, `--current` | none |
| `skills:validate` | `--skill` | none |

### Claims

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `claim:check-stale` | none | `--ttl-minutes` |

### Session

| Command | Required Flags | Optional Flags |
|---------|----------------|----------------|
| `session:remind` | none | none |

## Validation Checklist

When adding or modifying a command, verify:

- [ ] All parameters use named flags (no positional args)
- [ ] Entity IDs follow `--<entity>-id` pattern
- [ ] Status uses `--status` (not alternatives)
- [ ] Boolean flags have no value
- [ ] Flag names are kebab-case
- [ ] Help output lists all required and optional flags
- [ ] Error messages include valid alternatives
