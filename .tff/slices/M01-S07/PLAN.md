# Plan — M01-S07: Bead Status Sync

## Tier: S (quick fix)

## Tasks

### T01 — Register tff custom statuses during project:init
**File**: `tools/src/application/project/init-project.ts`
- After `beadStore.init()` (line 21), call `bd config set status.custom "discussing,researching,planning,executing,verifying,reviewing,completing"`
- Add a `configureStatuses` method to `BeadStore` port, or use a direct CLI call in the init flow

### T02 — Check updateStatus Result in transitionSliceUseCase
**File**: `tools/src/application/lifecycle/transition-slice.ts`
- Line 17: capture the Result from `beadStore.updateStatus()` and return error if it fails
- Currently: `await deps.beadStore.updateStatus(...)` (result ignored)

### T03 — Register statuses for existing projects
**File**: `tools/src/cli/commands/project-init.cmd.ts` (or new repair command)
- For already-initialized projects, provide a way to register the custom statuses retroactively

## Acceptance Criteria
- [ ] `bd update <id> -s researching` succeeds after project:init
- [ ] `transitionSliceUseCase` returns Err when bead update fails
- [ ] All existing tests pass
