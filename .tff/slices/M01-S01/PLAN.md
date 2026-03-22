# Plan — M01-S01: Error Code Fixes

## Tier: S (quick fix)

## Tasks

### T01 — Fix MarkdownArtifactAdapter error codes
**File**: `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.ts`
- Line 13: Change `PROJECT_EXISTS` → `NOT_FOUND` (file-not-found error)
- Line 18: Change `SYNC_CONFLICT` → `VALIDATION_ERROR` (write failure)
- Line 32: Change `SYNC_CONFLICT` → `VALIDATION_ERROR` (mkdir failure)

### T02 — Fix version drift in CLI help
**File**: `tools/src/cli/index.ts`
- Line 69: Change `'0.4.0'` → `'0.5.0'` to match `package.json`

### T03 — Update existing tests
**File**: `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.spec.ts`
- Update any assertions that expect `PROJECT_EXISTS` or `SYNC_CONFLICT` to match new codes

## Acceptance Criteria
- [ ] `MarkdownArtifactAdapter.read` returns `NOT_FOUND` for missing files
- [ ] `MarkdownArtifactAdapter.write` and `mkdir` return `VALIDATION_ERROR` for failures
- [ ] CLI `--help` reports version `0.5.0` matching `package.json`
- [ ] All existing tests pass with updated error codes
