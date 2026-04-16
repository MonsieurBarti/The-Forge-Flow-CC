# tff-tools Reference

Complete reference for all tff-tools CLI commands.

## Quick Reference Table

| Command | Purpose | Required Flags | Optional Flags |
|---------|---------|----------------|----------------|
| `project:init` | Initialize a new TFF project | `--name` | `--vision` |
| `project:get` | Get current project information | none | none |
| `milestone:create` | Create a new milestone | `--name` | none |
| `milestone:list` | List all milestones | none | none |
| `milestone:close` | Close a milestone | `--milestone-id` | `--reason` |
| `slice:create` | Create a new slice | `--title` | `--milestone-id` |
| `slice:list` | List all slices | none | `--milestone-id` |
| `slice:transition` | Transition a slice to a new status | `--slice-id`, `--status` | none |
| `slice:close` | Close a slice | `--slice-id` | `--reason` |
| `slice:classify` | Classify slice complexity | `--signals` | none |
| `task:claim` | Claim a task for execution | `--task-id` | `--claimed-by` |
| `task:close` | Close a completed task | `--task-id` | `--reason` |
| `task:ready` | List ready tasks for a slice | `--slice-id` | none |
| `dep:add` | Add a dependency between entities | `--from-id`, `--to-id` | none |
| `direct-edit:guard` | Check for direct edits | none | none |
| `pre-op:guard` | Validate operation is allowed | `--slice-id`, `--operation` | none |
| `spec-edit:guard` | Check for spec edits | none | none |
| `waves:detect` | Detect execution waves from tasks | `--tasks` | none |
| `sync:state` | Synchronize STATE.md for a milestone | `--milestone-id` | none |
| `worktree:create` | Create a git worktree for a slice | `--slice-id` | none |
| `worktree:delete` | Delete a git worktree | `--slice-id` | none |
| `worktree:list` | List all git worktrees | none | none |
| `review:check-fresh` | Check if reviewer is fresh | `--slice-id`, `--agent` | none |
| `review:record` | Record a review for a slice | `--slice-id`, `--agent`, `--verdict`, `--type`, `--commit-sha` | none |
| `checkpoint:save` | Save a checkpoint for a slice | `--slice-id`, `--base-commit`, `--current-wave`, `--completed-waves`, `--completed-tasks`, `--executor-log` | none |
| `checkpoint:load` | Load a checkpoint for a slice | `--slice-id` | none |
| `observe:record` | Record an observation | `--ts`, `--session`, `--tool`, `--args`, `--project` | none |
| `patterns:extract` | Extract patterns from observations | none | none |
| `patterns:aggregate` | Aggregate patterns by frequency | none | `--min-count` |
| `patterns:rank` | Rank pattern candidates | none | `--threshold` |
| `compose:detect` | Detect clusters from observations | `--observations` | `--options` |
| `skills:drift` | Check for drift between content | `--original`, `--current` | none |
| `skills:validate` | Validate a skill definition | `--skill` | none |
| `workflow:next` | Get next workflow status | `--status` | none |
| `workflow:should-auto` | Check if auto-transition is allowed | `--status`, `--mode` | none |
| `claim:check-stale` | Check for stale task claims | none | `--ttl-minutes` |
| `session:remind` | Generate session reminder | none | none |

## Command Details

### project:init

**Purpose:** Initialize a new TFF project

**Syntax:** `project:init --name <string> [--vision <string>]`

**Required Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--name` | string | Project name |

**Optional Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--vision` | string | Project vision statement |

**Examples:**
```bash
project:init --name "My Project"
project:init --name "My Project" --vision "Build the best thing"
```

**Output:** `{ "ok": true, "data": { "id": "...", "name": "...", "vision": "..." } }`

---

### project:get

**Purpose:** Get the current project information

**Syntax:** `project:get`

**Required Flags:** none

**Optional Flags:** none

**Examples:**
```bash
project:get
```

**Output:** `{ "ok": true, "data": { "id": "...", "name": "...", "vision": "..." } }`

---

### milestone:create

**Purpose:** Create a new milestone

**Syntax:** `milestone:create --name <string>`

**Required Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--name` | string | Milestone name |

**Optional Flags:** none

**Examples:**
```bash
milestone:create --name "Phase 1: Core Features"
```

**Output:** `{ "ok": true, "data": { "id": "M01", "name": "...", "number": 1 } }`

---

### milestone:list

**Purpose:** List all milestones

**Syntax:** `milestone:list`

**Required Flags:** none

**Optional Flags:** none

**Examples:**
```bash
milestone:list
```

**Output:** `{ "ok": true, "data": [{ "id": "M01", "name": "...", "status": "open" }, ...] }`

---

### milestone:close

**Purpose:** Close a milestone

**Syntax:** `milestone:close --milestone-id <string> [--reason <string>]`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--milestone-id` | string | Milestone ID to close | `^M\d+$` |

**Optional Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--reason` | string | Reason for closing |

**Examples:**
```bash
milestone:close --milestone-id M01
milestone:close --milestone-id M01 --reason "Completed"
```

**Output:** `{ "ok": true, "data": { "status": "closed", "reason": "..." } }`

---

### slice:create

**Purpose:** Create a new slice in a milestone

**Syntax:** `slice:create --title <string> [--milestone-id <string>]`

**Required Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--title` | string | Title for the new slice |

**Optional Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--milestone-id` | string | Milestone ID (auto-detected if not provided) | `^M\d+$` |

**Examples:**
```bash
slice:create --title "Implement feature X"
slice:create --title "Fix bug Y" --milestone-id M01
```

**Output:** `{ "ok": true, "data": { "id": "M01-S01", "title": "...", "status": "discussing" } }`

---

### slice:list

**Purpose:** List all slices, optionally filtered by milestone

**Syntax:** `slice:list [--milestone-id <string>]`

**Required Flags:** none

**Optional Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--milestone-id` | string | Filter by milestone ID | `^M\d+$` |

**Examples:**
```bash
slice:list
slice:list --milestone-id M01
```

**Output:** `{ "ok": true, "data": [{ "id": "M01-S01", "title": "...", "status": "..." }, ...] }`

---

### slice:transition

**Purpose:** Transition a slice to a new status

**Syntax:** `slice:transition --slice-id <string> --status <string>`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--slice-id` | string | Slice ID | `^M\d+-S\d+$` |
| `--status` | string | Target status | Enum: `discussing`, `researching`, `planning`, `executing`, `verifying`, `reviewing`, `shipping`, `closed` |

**Optional Flags:** none

**Examples:**
```bash
slice:transition --slice-id M01-S01 --status planning
```

**Output:** `{ "ok": true, "data": { "status": "planning" }, "warnings": [] }`

---

### slice:close

**Purpose:** Close a slice

**Syntax:** `slice:close --slice-id <string> [--reason <string>]`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--slice-id` | string | Slice ID to close | `^M\d+-S\d+$` |

**Optional Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--reason` | string | Reason for closing |

**Examples:**
```bash
slice:close --slice-id M01-S01
slice:close --slice-id M01-S01 --reason "Completed"
```

**Output:** `{ "ok": true, "data": { "status": "closed", "reason": "..." } }`

---

### slice:classify

**Purpose:** Classify a slice's complexity tier based on signals

**Syntax:** `slice:classify --signals <json>`

**Required Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--signals` | json | JSON object with classification signals |

**Optional Flags:** none

**Examples:**
```bash
slice:classify --signals '{"taskCount":5,"estimatedFilesAffected":3,"newFilesCreated":0,"modulesAffected":2,"hasExternalIntegrations":false,"requiresInvestigation":true,"architectureImpact":false,"unknownsSurfaced":1,"riskLevel":"low"}'
```

**Output:** `{ "ok": true, "data": { "tier": "F-lite" } }`

---

### task:claim

**Purpose:** Claim a task for execution

**Syntax:** `task:claim --task-id <string> [--claimed-by <string>]`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--task-id` | string | Task ID to claim | `^M\d+-S\d+-T\d+$` |

**Optional Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--claimed-by` | string | Agent identity claiming the task |

**Examples:**
```bash
task:claim --task-id M01-S01-T01
task:claim --task-id M01-S01-T01 --claimed-by executor
```

**Output:** `{ "ok": true, "data": null }`

---

### task:close

**Purpose:** Close a completed task

**Syntax:** `task:close --task-id <string> [--reason <string>]`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--task-id` | string | Task ID to close | `^M\d+-S\d+-T\d+$` |

**Optional Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--reason` | string | Reason for closing |

**Examples:**
```bash
task:close --task-id M01-S01-T01
task:close --task-id M01-S01-T01 --reason "Completed successfully"
```

**Output:** `{ "ok": true, "data": null }`

---

### task:ready

**Purpose:** List ready tasks for a slice

**Syntax:** `task:ready --slice-id <string>`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--slice-id` | string | Slice ID to list ready tasks for | `^M\d+-S\d+$` |

**Optional Flags:** none

**Examples:**
```bash
task:ready --slice-id M01-S01
```

**Output:** `{ "ok": true, "data": [{ "id": "M01-S01-T01", "title": "...", "status": "ready" }, ...] }`

---

### dep:add

**Purpose:** Add a dependency between two entities

**Syntax:** `dep:add --from-id <string> --to-id <string>`

**Required Flags:**
| Flag | Type | Description |
|------|------|-------------|
| `--from-id` | string | ID of the entity that is blocked |
| `--to-id` | string | ID of the blocking entity |

**Optional Flags:** none

**Examples:**
```bash
dep:add --from-id M01-S01-T02 --to-id M01-S01-T01
```

**Output:** `{ "ok": true, "data": null }`

---

### checkpoint:save

**Purpose:** Save a checkpoint for a slice

**Syntax:** `checkpoint:save --slice-id <string> --base-commit <string> --current-wave <number> --completed-waves <json> --completed-tasks <json> --executor-log <json>`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--slice-id` | string | Slice ID | `^M\d+-S\d+$` |
| `--base-commit` | string | Base commit SHA | |
| `--current-wave` | number | Current wave index | |
| `--completed-waves` | json | JSON array of completed wave indices | |
| `--completed-tasks` | json | JSON array of completed task IDs | |
| `--executor-log` | json | JSON array of executor log entries | |

**Optional Flags:** none

**Examples:**
```bash
checkpoint:save --slice-id M01-S01 --base-commit abc123 --current-wave 0 --completed-waves '[]' --completed-tasks '[]' --executor-log '[]'
```

**Output:** `{ "ok": true, "data": null }`

---

### checkpoint:load

**Purpose:** Load a checkpoint for a slice

**Syntax:** `checkpoint:load --slice-id <string>`

**Required Flags:**
| Flag | Type | Description | Pattern |
|------|------|-------------|---------|
| `--slice-id` | string | Slice ID | `^M\d+-S\d+$` |

**Optional Flags:** none

**Examples:**
```bash
checkpoint:load --slice-id M01-S01
```

**Output:** `{ "ok": true, "data": { "sliceId": "M01-S01", "baseCommit": "..., "currentWave": 0, ... } }`

---

## Introspection

### --help flag

Running any command with `--help` outputs structured JSON help data:

```bash
slice:transition --help
```

Output:
```json
{
  "ok": true,
  "data": {
    "name": "slice:transition",
    "purpose": "Transition a slice to a new status",
    "syntax": "slice:transition --slice-id <string> --status <string>",
    "requiredFlags": [
      { "name": "--slice-id", "type": "string", "description": "Slice ID (e.g., M01-S01)", "pattern": "^M\\d+-S\\d+$" },
      { "name": "--status", "type": "string", "description": "Target status", "enum": ["discussing", "researching", "planning", "executing", "verifying", "reviewing", "shipping", "closed"] }
    ],
    "optionalFlags": [],
    "examples": ["slice:transition --slice-id M01-S01 --status planning"]
  }
}
```

### --help --json flag combo

Running any command with both `--help` and `--json` outputs JSON Schema format:

```bash
slice:transition --help --json
```

Output:
```json
{
  "ok": true,
  "data": {
    "command": "slice:transition",
    "flags": {
      "type": "object",
      "required": ["slice-id", "status"],
      "properties": {
        "slice-id": { "type": "string", "description": "Slice ID (e.g., M01-S01)", "pattern": "^M\\d+-S\\d+$" },
        "status": { "type": "string", "description": "Target status", "enum": ["discussing", "researching", "planning", "executing", "verifying", "reviewing", "shipping", "closed"] }
      }
    }
  }
}
```

### schema command

The `schema` command returns JSON Schema for any command:

```bash
schema --command slice:transition
```

Output: Same as `--help --json` above.

## Error Messages

All error messages are structured JSON with helpful information:

### Missing Required Flag
```json
{
  "ok": false,
  "error": {
    "code": "MISSING_REQUIRED_FLAG",
    "message": "Missing required flag(s): --status",
    "missingFlags": ["status"],
    "validFlags": ["slice-id", "status"]
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
    "unknownFlag": "target-status",
    "validFlags": ["slice-id", "status"]
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
    "flag": "status",
    "provided": "invalid",
    "validValues": ["discussing", "researching", "planning", "executing", "verifying", "reviewing", "shipping", "closed"]
  }
}
```

### Pattern Mismatch
```json
{
  "ok": false,
  "error": {
    "code": "PATTERN_MISMATCH",
    "message": "Invalid format for --slice-id: 'invalid'. Must match pattern: ^M\\d+-S\\d+$",
    "flag": "slice-id",
    "provided": "invalid",
    "pattern": "^M\\d+-S\\d+$"
  }
}
```
