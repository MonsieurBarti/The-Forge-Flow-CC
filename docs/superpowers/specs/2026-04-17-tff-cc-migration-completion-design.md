# Complete the `.tff/` → `.tff-cc/` migration

**Date:** 2026-04-17
**Status:** Approved for planning
**Resolves:** #91, #92
**Scope:** Single bundled PR

## Context

PR #87 (commit `0e08481`, "migrate to .tff-cc state directory with UUID-based branches") renamed the state directory from `.tff/` to `.tff-cc/`. The migration was incomplete: about a dozen call-sites, hooks, tests, and docs still reference `.tff/`, producing a split-brain where hooks write to one path and workflows read from another. Two issues filed on 2026-04-17 (#91 install/setup failures, #92 path drift across subsystems) document the symptoms.

Root cause: the original rename PR shipped without an end-to-end test walking `/tff:new` → milestone → slice → ship on a clean repo, and without a `grep` audit of remaining `.tff/` references. The maintainer's own repo was never migrated, so local dog-fooding never exercised the new layout.

## Goals

1. Resolve #91 and #92 in one PR.
2. Make `.tff-cc/` the single canonical in-repo name for every read, write, hook, test, doc, and settings lookup.
3. Ship built `dist/` to plugin consumers without polluting `main`'s working tree — use a release-branch model.
4. Convert the test suite from "green because it asserts the current (wrong) paths" to "green because paths are correct," and add a path-contract integration test to prevent regression.
5. Fix the `.original.md` duplication so Claude Code loads each command exactly once.

## Non-goals

- Changing the `.tff-project-id` filename or UUID scheme.
- Reverting the compression style of docs. Compressed `.md` files stay compressed; only backup location moves.
- Fixing `compress-md.js` regex footguns (`\bno\b`, `\bor\b` in prose). Tracked as follow-up.
- Changing the npm publish flow in `release.yml`.
- Migration tooling for end users who manually edited `.tff/` outside tff commands.

## Success criteria (binary, testable)

- `grep -rE '\.tff($|[^-c])' src/ hooks/ workflows/ commands/ skills/ references/ tests/` returns matches only inside the legitimate-legacy whitelist documented in *Whitelist of legitimate `.tff/` references* below.
- `bun run test` passes with all assertions on `.tff-cc/` paths.
- New path-contract integration test fails if any artifact writer regresses to `.tff/`.
- `claude /plugin install` from the `release` branch produces a working install with `dist/cli/index.js` present and executable, no manual `bun install` required.
- `ls commands/tff/ skills/*/ workflows/` shows zero `*.original.md` files.
- Hook execution writes to `.tff-cc/observations/`, and guards read settings from `.tff-cc/settings.yaml`.

## Architecture after the change

```
┌─────────────────────────────────────────────────────────────────┐
│                     Repo working tree                           │
│                                                                 │
│   .tff-cc/  ─symlink──►  ~/.tff-cc/<projectId>/  (home dir)     │
│       │                     │                                   │
│       │                     ├─ state.db                         │
│       │                     ├─ settings.yaml                    │
│       │                     ├─ PROJECT.md                       │
│       │                     ├─ STATE.md                         │
│       │                     ├─ milestones/<M0X>/…               │
│       │                     ├─ worktrees/<sliceId>/             │
│       │                     ├─ observations/                    │
│       │                     └─ journal/                         │
│       │                                                         │
│   .tff-project-id   (UUID v4, in-repo, committed)               │
│   .gitignore        (contains `.tff-cc/`, no `.tff/`)           │
└─────────────────────────────────────────────────────────────────┘

All writers (artifact, hooks, post-checkout, generate-state) ─► `.tff-cc/`
All readers (CLI, workflows, guards)                         ─► `.tff-cc/`
Migration detector                                           ─► `.tff/`  (only legitimate reference)
```

**Single invariant enforced everywhere:** the literal string `.tff/` appears in code/docs/tests only in the migration subsystem (where it is the legacy path being migrated *from*). Every other site uses `.tff-cc/`. A CI grep guard enforces this.

### Release packaging

```
main branch (dev):              release branch (consumer-facing):
  src/                            src/
  plugin/ (symlinks)              plugin/ (materialized files)
  .gitignore ignores dist/        .gitignore allows dist/
  # no dist/                      dist/ (built, committed by CI)
  # no native/*.node in plugin    native/*.node copied into dist/…/sqlite/

         │
         └── CI on release ───► force-push built snapshot to `release`
```

Consumers install from `release`; contributors develop on `main`.

### Integration test layering

- **vitest (per-PR, CI blocking):** `tests/integration/path-contract.spec.ts`. Real tmp dir, real sqlite. Runs `project:init` → `milestone:create` → `slice:create` → `checkpoint:save` → `generate-state` → `worktree:create`. Asserts every artifact at `.tff-cc/…`; grep of tmp dir finds no `.tff/` prefixes.
- **shell integration (release-branch validation):** new workflow `release-branch-validation.yml`, runs on push to `release` + nightly. Checks out `release` to tmp, runs `node dist/cli/index.js --version`, runs `hooks/tff-observe.sh` with stub env, greps for `.tff/` and fails if found.

## Change catalogue

### Artifact writers

| File | Line | Change |
|---|---|---|
| `src/application/milestone/create-milestone.ts` | 45 | `.tff/milestones/…` → `.tff-cc/milestones/…` |
| `src/application/slice/create-slice.ts` | 51 | same |
| `src/application/checkpoint/save-checkpoint.ts` | 34 | same |
| `src/application/checkpoint/load-checkpoint.ts` | 15 | same |
| `src/application/worktree/create-worktree.ts` | 29 | `.tff/worktrees/…` → `.tff-cc/worktrees/…` |
| `src/application/worktree/delete-worktree.ts` | 16 | same |
| `src/application/sync/generate-state.ts` | 77 | `.tff/STATE.md` → `.tff-cc/STATE.md` |
| `src/domain/value-objects/journal-entry.builder.ts` | 155 | default `artifactPath` `.tff/…` → `.tff-cc/…` |

### CLI commands (observation stores)

| File | Line | Change |
|---|---|---|
| `src/cli/commands/patterns-extract.cmd.ts` | 30 | `new JsonlStoreAdapter(".tff/observations")` → `.tff-cc/observations` |
| `src/cli/commands/patterns-aggregate.cmd.ts` | 28 | same |
| `src/cli/commands/patterns-rank.cmd.ts` | 28 | same |
| `src/cli/commands/observe-record.cmd.ts` | 56 | same |

### Hooks

| File | Change |
|---|---|
| `hooks/tff-observe.sh` | `SETTINGS=".tff/settings.yaml"` → `.tff-cc/settings.yaml`; `OBS_DIR=".tff/observations"` → `.tff-cc/observations` |
| `hooks/tff-remind.sh` | `SETTINGS=".tff/settings.yaml"` → `.tff-cc/settings.yaml` |
| `hooks/tff-observe.test.sh` | all `.tff/observations`, `.tff/settings.yaml` → `.tff-cc/…` |
| `src/infrastructure/hooks/post-checkout-template.ts` | `mkdir -p "$CWD_ROOT/.tff"` → `.tff-cc`; log path → `.tff-cc/hook.log`; update comment |

### Migration subsystem (fix detector, keep legitimate `.tff/` refs)

| File | Line | Change |
|---|---|---|
| `src/infrastructure/migration.ts` | 29 | `const tffPath = join(repoRoot, ".tff-cc")` → `join(repoRoot, ".tff")` |
| `src/infrastructure/migration.ts` | 102 | `const tffPath = join(repoRoot, ".tff-cc")` → `join(repoRoot, ".tff")` |
| `src/infrastructure/migration.ts` | 34, 116, 123, 124, 126, 130 | keep comments/strings already referring to `.tff/` as legacy |
| `src/infrastructure/migration.ts` | — | Add log line "Migrating legacy .tff/ to ~/.tff-cc/<id>/" when migration runs |

After this fix, `detectLegacyPattern` truthfully detects `.tff/` legacy dirs, copies contents to `~/.tff-cc/<projectId>/`, deletes `.tff/`, creates `.tff-cc` symlink. Restoration path rolls back correctly.

### Project init (gitignore)

| File | Line | Change |
|---|---|---|
| `src/application/project/init-project.ts` | 40 | Comment `// Ensure .tff/ and build/…` → `// Ensure .tff-cc/ and build/…` |
| `src/application/project/init-project.ts` | `REQUIRED_GITIGNORE_ENTRIES` | Keep `[".tff-cc/", "build/"]` — already correct |

### Symlink function rename (cosmetic)

| File | Change |
|---|---|
| `src/infrastructure/home-directory.ts` | `createTffSymlink` → `createTffCcSymlink`; update doc comments and all callers |
| `src/infrastructure/adapters/sqlite/create-state-stores.ts` | Update import/call site |

### `slice:create --milestone-id` UX (#92 P2)

| File | Change |
|---|---|
| `src/cli/commands/slice-create.cmd.ts` (flag handler) | Resolve milestone label → UUID before `getMilestone`. Accept both forms. Update `--help` text. |

Add unit test for label→UUID resolution.

### Documentation

Replace `.tff/` with `.tff-cc/` in:

- `commands/tff/map-codebase.md:9`
- `commands/tff/status.md:12`
- `references/model-profiles.md:3,21`
- `references/settings-template.md:3`
- `skills/plannotator-usage/SKILL.md:16,17`
- Spot-check `references/conventions.md` (largely already migrated per #92).

Add to `references/conventions.md`: a note that `.tff-cc/` in the repo is a symlink to `~/.tff-cc/{projectId}/`, created by `project:init`. Direct `mkdir -p .tff-cc/…` before init is unsafe.

Workflow fixes from #91:

- `workflows/new-project.md:18` — move `mkdir -p .tff-cc/docs` after `project:init`, or drop (init creates dirs).
- `workflows/map-codebase.md:11` — same reorder.
- `workflows/map-codebase.md:18` — drop `git add .tff-cc/docs/ && git commit` (outside repo via symlink; misleading).

### `.original.md` backup cleanup

Move all 71 `*.md.original.md` files from `commands/tff/`, `skills/*/`, `workflows/` to `scripts/backups/<same-relative-path>.md`. Keep them committed but out of Claude Code's load path.

Update `scripts/compress-md.js` docstring to note the backup location convention.

### Release-branch packaging (c.1)

New file `scripts/sync-release-branch.sh`:

1. `git worktree add /tmp/release release || git worktree add -B release /tmp/release HEAD`
2. `rsync` into `/tmp/release`:
    - All of `plugin/` contents **materialized** (resolve symlinks).
    - Built `dist/`.
    - `native/*.node` copied into `dist/infrastructure/adapters/sqlite/`.
    - `.claude-plugin/`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`.
    - Minimal `.gitignore` that does not ignore `dist/`.
3. Force-push `release` branch (build output, not history).

Update `.github/workflows/release.yml` with a new step gated on `steps.release.outputs.release_created`:

```yaml
- name: Sync release branch
  if: ${{ steps.release.outputs.release_created }}
  run: bash scripts/sync-release-branch.sh
```

Update README/marketplace docs: consumers install from the `release` branch.

**Open question — resolve early in Phase F:** Does `claude /plugin install` support branch-qualified refs (e.g., `<repo-url>@release`), or does it always install the default branch? Three outcomes:

- If branch-qualified install is supported → document the `@release` suffix in README.
- If not supported and we can change the marketplace default-branch without breaking dev → change GitHub default branch from `main` to `release`, keep `main` as working branch for PRs. Risk: some GitHub UI defaults (PR base, README display) shift.
- If neither works → fall back to the distribution-repo model (c.2) as a follow-up; for this PR, ship everything *except* Phase F and leave the `dist/` packaging issue as a known limitation until the distribution repo exists.

This must be resolved before Phase F merges. Research step is cheap (docs check + smoke test); defer the code in Phase F only if the install model is workable.

**Decision recorded:** We chose option (2) — `marketplace.json`'s per-plugin `source` object with `source: "github"`, `repo: "MonsieurBarti/The-Forge-Flow-CC"`, `ref: "release"`. This pins the marketplace to the `release` branch without changing GitHub's default branch and keeps `main` as the working branch for PRs. See the official Anthropic docs on "Create and distribute a plugin marketplace" (<https://code.claude.com/docs/en/plugin-marketplaces>). This is why `.claude-plugin/marketplace.json` was updated in commit `352941e`.

### Test assertions to update

Update `.tff/` → `.tff-cc/` in:

- `tests/unit/application/milestone/create-milestone.spec.ts:52,63`
- `tests/unit/application/slice/create-slice.spec.ts:52,76,77`
- `tests/unit/application/worktree/create-worktree.spec.ts:43,54`
- `tests/unit/application/worktree/list-worktrees.spec.ts:13,14`
- `tests/unit/application/worktree/delete-worktree.spec.ts:13`
- `tests/unit/application/sync/generate-state.spec.ts:50`
- `tests/unit/application/guard/detect-spec-edit.spec.ts:127,204,205,221,229`
- `tests/unit/domain/value-objects/journal-entry.spec.ts:79`
- `tests/unit/infrastructure/testing/in-memory-git-ops.spec.ts:51,53,58,59`
- `tests/unit/infrastructure/hooks/post-checkout-template.spec.ts:24,25`

Keep `.tff/` in `tests/unit/infrastructure/migration.spec.ts` — tests legacy path on purpose.

### New tests

- `tests/integration/path-contract.spec.ts`: real tmp dir, run `project:init` → `milestone:create` → `slice:create` → `checkpoint:save` → `generate-state` → `worktree:create`. Assert: every artifact under `.tff-cc/`; `grep -r "^\.tff/" <tmp>` empty; `.tff-project-id` UUID matches home-dir name.
- `.github/workflows/release-branch-validation.yml`: on push to `release` + nightly cron. Checkout release branch to tmp, run `node dist/cli/index.js --version`, run `hooks/tff-observe.sh` with stub env, grep for `.tff/` and fail if found.

### Whitelist of legitimate `.tff/` references

- `src/infrastructure/migration.ts` — detecting/reading/deleting the legacy path.
- `tests/unit/infrastructure/migration.spec.ts` — testing the above.
- Any `CHANGELOG.md` entry describing migration history (read-only).

CI grep guard fails the build on any other `.tff/` occurrence.

## Implementation phases

Each phase ends at green `bun run test` so the PR is reviewable commit-by-commit.

**Phase A — Path rename (tests-first).**
1. Update every test assertion from *Test assertions to update* above to `.tff-cc/`. Suite goes red.
2. Update artifact writers, CLI commands, hooks, migration detector, init-project comment, symlink function rename. Suite goes green.
3. Commit.

**Phase B — Path-contract integration test.**
1. Add `tests/integration/path-contract.spec.ts`.
2. Add CI grep guard script fail-on-stray-`.tff/`.
3. Commit.

**Phase C — UX fixes.**
1. `slice:create --milestone-id` resolves label → UUID.
2. Unit test for label→UUID resolution.
3. Commit.

**Phase D — Docs & workflow fixes.**
1. `.tff/` → `.tff-cc/` in all docs.
2. Reorder `new-project.md` / `map-codebase.md` steps; drop misleading `git add`.
3. Add symlink-is-not-a-real-dir note to `references/conventions.md`.
4. Commit.

**Phase E — `.original.md` cleanup.**
1. `git mv` all 71 files to `scripts/backups/<relative-path>.md`.
2. Update `scripts/compress-md.js` docstring.
3. Verify zero `.original.md` in loaded paths.
4. Commit.

**Phase F — Release-branch packaging.**
1. Add `scripts/sync-release-branch.sh`.
2. Update `release.yml` with sync step.
3. Add `release-branch-validation.yml`.
4. Update README/marketplace docs.
5. Commit.
6. Post-merge: verify `release` branch appears with `dist/` on next release-please version bump.

**Phase G — Local dev repo cleanup (not in PR).**
1. `rm .tff .tff-project-id` on maintainer's working copy.
2. Re-run `/tff:new` to exercise the fixed install path end-to-end.

## Risk & rollback

- **Phase F is the only risky phase.** Wrong sync script = broken `release` branch for consumers. Mitigation: `release-branch-validation.yml` must be green before announcing the install path change. Keep the current install path (npm + manual `bun install`) documented until validation passes for one release cycle.
- **Force-push to `release`.** By design — branch is a build artifact. Document in `CONTRIBUTING.md` and `release.yml` comments.
- **No data-loss risk in Phases A–E.** In-repo source changes; worst case is test failure caught in CI.
- **Migration detector change.** After Phase A, legacy `.tff/` dirs are finally migrated on next run. `copyDir` is recursive and type-agnostic so user-edited subdirs are preserved. The added log line gives users visibility.

## Out-of-scope follow-ups

- `compress-md.js` regex footguns (`\bno\b`, `\bor\b` in prose).
- Whether `dist/` on `release` should include a checksum for tamper detection.
- Whether `marketplace.json` should gain an explicit `branch`/`ref` field.
