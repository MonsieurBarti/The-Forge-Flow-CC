# Plan — M01-S02: Observability

## Tier: S (quick fix)

## Approach
Use the existing `console.warn('[tff] ...')` pattern (already in `project-settings.ts`) consistently. No new logging framework — just a small `warn` helper to standardize the prefix.

## Tasks

### T01 — Add warn helper
**File**: `tools/src/infrastructure/adapters/logging/warn.ts` (new)
- Export a `tffWarn(message: string, context?: Record<string, unknown>)` function
- Uses `console.warn('[tff]', message, ...context)` pattern
- Keep it dead simple — no levels, no transports

### T02 — Surface bead adapter selection
**File**: `tools/src/infrastructure/adapters/beads/bead-adapter-factory.ts`
- After adapter selection (line 31-34), log which adapter was chosen
- `tffWarn('using beads adapter: bd-cli')` or `tffWarn('using beads adapter: markdown-fallback')`

### T03 — Replace swallowed errors in slice:transition
**File**: `tools/src/cli/commands/slice-transition.cmd.ts`
- Line 39: Replace `catch { /* snapshot failure is non-blocking */ }` with `catch (e) { tffWarn('snapshot failed', { error: String(e) }); }`
- Line 51: Replace `catch { /* dolt sync failure is non-blocking */ }` with `catch (e) { tffWarn('dolt sync failed', { error: String(e) }); }`

### T04 — Update existing console.warn in project-settings.ts
**File**: `tools/src/domain/value-objects/project-settings.ts`
- Replace raw `console.warn('[tff] ...')` calls with `tffWarn(...)` for consistency

## Acceptance Criteria
- [ ] Adapter selection logs which adapter is in use via stderr
- [ ] Snapshot and Dolt push failures produce a warning instead of being silently swallowed
- [ ] All `[tff]` warnings use the shared `tffWarn` helper
- [ ] All existing tests pass
