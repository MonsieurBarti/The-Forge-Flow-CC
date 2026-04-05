# Bugfix: State Branch Artifact Leak

**Date**: 2026-04-03
**Severity**: Low (cosmetic — untracked files, no data loss)
**Affected files**:
- `tools/src/infrastructure/adapters/git/git-state-branch.adapter.ts`
- `tools/src/cli/commands/hook-post-checkout.cmd.ts`
- `tools/src/cli/with-branch-guard.ts`

## Problem

`branch-meta.json` and `milestones/` directory were appearing as untracked files on code branches (e.g. `milestone/M06`).

These are state-only artifacts that live on `tff-state/*` branches. They exist at the root of the state branch tree (outside `.tff/`), so they aren't covered by the `.tff/` blanket gitignore.

## Root Cause

The `restore()` method in `GitStateBranchAdapter` extracts **all** files from the state branch to the working directory — no prefix filtering. This includes:

- `branch-meta.json` (state branch identity metadata)
- `milestones/` (artifact copies at root, outside `.tff/`)
- `.gitignore` (state branch's own gitignore)

The post-checkout hook and branch guard both called `restore()`, then read `branch-meta.json` from disk to extract `stateId` for the local stamp. Neither cleaned up the root-level file afterward.

## Fix

### 1. `git-state-branch.adapter.ts` — `restore()` method

Added a prefix filter so only `.tff/` files are restored to the working directory:

```typescript
for (const filePath of filesR.data) {
  if (!filePath.startsWith('.tff/')) continue; // <-- added
  // ...
}
```

### 2. `hook-post-checkout.cmd.ts` — stamp extraction

Instead of reading `branch-meta.json` from the working directory after restore, now extracts it directly from the state branch via `gitOps.extractFile()`:

```typescript
const metaBufR = await gitOps.extractFile(`tff-state/${codeBranch}`, 'branch-meta.json');
if (isOk(metaBufR)) {
  const raw = JSON.parse(metaBufR.data.toString('utf8'));
  const meta = BranchMetaSchema.parse(raw);
  writeLocalStamp(tffDir, { ... });
}
```

Removed unused `existsSync` / `readFileSync` imports.

### 3. `with-branch-guard.ts` — `handleMismatch()`

Same change as #2 — extract `branch-meta.json` from git instead of disk.

Removed unused `existsSync` / `readFileSync` imports.

## Verification

- Build passes (`tsup`)
- All 1108 tests pass (`vitest run`)
- `git status` on code branch shows no leaked artifacts
