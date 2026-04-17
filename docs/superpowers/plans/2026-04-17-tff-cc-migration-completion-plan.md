# Implementation plan: complete `.tff/` → `.tff-cc/` migration

**Spec:** `docs/superpowers/specs/2026-04-17-tff-cc-migration-completion-design.md`
**Resolves:** #91, #92
**Branch:** `fix/complete-tff-cc-migration` (cut from `main`)
**Commit convention:** conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Acceptance criteria (from spec)

- **AC1**: `grep -rE '\.tff($|[^-c])' src/ hooks/ workflows/ commands/ skills/ references/ tests/` returns matches only inside the legitimate-legacy whitelist.
- **AC2**: `bun run test` passes with all assertions on `.tff-cc/` paths.
- **AC3**: `tests/integration/path-contract.spec.ts` fails if any artifact writer regresses to `.tff/`.
- **AC4**: `claude /plugin install` from the `release` branch produces a working install with `dist/cli/index.js` present, no manual `bun install`.
- **AC5**: `ls commands/tff/ skills/*/ workflows/` shows zero `*.original.md` files.
- **AC6**: `hooks/tff-observe.sh` writes to `.tff-cc/observations/`; guards read `.tff-cc/settings.yaml`.

---

## Wave 0 — Flip test assertions (parallel)

All test-assertion updates. The suite will go red at the end of Wave 0 and stay red until Wave 1 completes. Each task is one file, one action.

### T01: Flip assertions in `create-milestone.spec.ts`
- **File**: `tests/unit/application/milestone/create-milestone.spec.ts`
- **Change**: `sed -i '' 's|\.tff/milestones|.tff-cc/milestones|g' <file>` (verify lines 52, 63 post-change)
- **Run**: `bun run test tests/unit/application/milestone/create-milestone.spec.ts`
- **Expect**: FAIL — `artifactStore.exists(".tff-cc/milestones/M01/REQUIREMENTS.md")` returns `false` because writer still writes to `.tff/`
- **AC**: AC2

### T02: Flip assertions in `create-slice.spec.ts`
- **File**: `tests/unit/application/slice/create-slice.spec.ts`
- **Change**: `sed -i '' 's|\.tff/milestones|.tff-cc/milestones|g' <file>` (verify lines 52, 76, 77)
- **Run**: `bun run test tests/unit/application/slice/create-slice.spec.ts`
- **Expect**: FAIL — all three assertions
- **AC**: AC2

### T03: Flip assertions in `create-worktree.spec.ts`
- **File**: `tests/unit/application/worktree/create-worktree.spec.ts`
- **Change**: `sed -i '' 's|\.tff/worktrees|.tff-cc/worktrees|g' <file>` (verify lines 43, 54)
- **Run**: `bun run test tests/unit/application/worktree/create-worktree.spec.ts`
- **Expect**: FAIL — both `worktreePath` expectations
- **AC**: AC2

### T04: Flip assertions in `list-worktrees.spec.ts`
- **File**: `tests/unit/application/worktree/list-worktrees.spec.ts`
- **Change**: `sed -i '' 's|\.tff/worktrees|.tff-cc/worktrees|g' <file>` (verify lines 13, 14)
- **Run**: `bun run test tests/unit/application/worktree/list-worktrees.spec.ts`
- **Expect**: FAIL (or may pass trivially if these are test-setup paths; confirm)
- **AC**: AC2

### T05: Flip assertions in `delete-worktree.spec.ts`
- **File**: `tests/unit/application/worktree/delete-worktree.spec.ts`
- **Change**: `sed -i '' 's|\.tff/worktrees|.tff-cc/worktrees|g' <file>` (verify line 13)
- **Run**: `bun run test tests/unit/application/worktree/delete-worktree.spec.ts`
- **Expect**: FAIL
- **AC**: AC2

### T06: Flip assertions in `generate-state.spec.ts`
- **File**: `tests/unit/application/sync/generate-state.spec.ts`
- **Change**: `sed -i '' 's|\.tff/STATE.md|.tff-cc/STATE.md|g' <file>` (verify line 50)
- **Run**: `bun run test tests/unit/application/sync/generate-state.spec.ts`
- **Expect**: FAIL — `.tff-cc/STATE.md` doesn't exist
- **AC**: AC2

### T07: Flip assertions in `detect-spec-edit.spec.ts`
- **File**: `tests/unit/application/guard/detect-spec-edit.spec.ts`
- **Change**: `sed -i '' 's|\.tff/milestones|.tff-cc/milestones|g' <file>` (verify lines 127, 204, 205, 221, 229); also flip `.tff\\milestones` → `.tff-cc\\milestones` on line 229
- **Run**: `bun run test tests/unit/application/guard/detect-spec-edit.spec.ts`
- **Expect**: PASS (this test matches any path ending in `SPEC.md`; the path prefix is irrelevant). No behavior change expected — verify the test is documentation-style only.
- **AC**: AC2

### T08: Flip default `artifactPath` in `journal-entry.spec.ts`
- **File**: `tests/unit/domain/value-objects/journal-entry.spec.ts`
- **Change**: `sed -i '' 's|\.tff/milestones|.tff-cc/milestones|g' <file>` (verify line 79)
- **Run**: `bun run test tests/unit/domain/value-objects/journal-entry.spec.ts`
- **Expect**: FAIL — default `artifactPath` in builder still starts with `.tff/`
- **AC**: AC2

### T09: Flip paths in `in-memory-git-ops.spec.ts`
- **File**: `tests/unit/infrastructure/testing/in-memory-git-ops.spec.ts`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (verify lines 51, 53, 58, 59)
- **Run**: `bun run test tests/unit/infrastructure/testing/in-memory-git-ops.spec.ts`
- **Expect**: PASS (in-memory adapter is path-agnostic; test uses paths as opaque strings)
- **AC**: AC2

### T10: Flip assertions in `post-checkout-template.spec.ts`
- **File**: `tests/unit/infrastructure/hooks/post-checkout-template.spec.ts`
- **Change**: `sed -i '' 's|\.tff/hook\.log|.tff-cc/hook.log|g' <file>` (verify lines 24, 25). Also rename test label "logs to `.tff/hook.log`" → "logs to `.tff-cc/hook.log`".
- **Run**: `bun run test tests/unit/infrastructure/hooks/post-checkout-template.spec.ts`
- **Expect**: FAIL — hook template string still contains `.tff/hook.log`
- **AC**: AC2

### T11: Commit Wave 0
- **Files**: 10 test files above
- **Run**: `git add tests/ && git commit -m "test: flip path assertions to .tff-cc/"`
- **Expect**: one commit containing only test changes. Do not run the full suite yet; expect many failures until Wave 1 completes.

---

## Wave 1 — Update implementation to match (parallel where independent)

All writers/readers flipped. After this wave the full suite returns to green.

### T12: Rename artifact path in `create-milestone.ts`
- **File**: `src/application/milestone/create-milestone.ts`
- **Change**: line 45, `\`.tff/milestones/${label}\`` → `\`.tff-cc/milestones/${label}\``
- **Run**: `bun run test tests/unit/application/milestone/create-milestone.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T13: Rename artifact path in `create-slice.ts`
- **File**: `src/application/slice/create-slice.ts`
- **Change**: line 51, `\`.tff/milestones/${msLabel}\`` → `\`.tff-cc/milestones/${msLabel}\``
- **Run**: `bun run test tests/unit/application/slice/create-slice.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T14: Rename artifact path in `save-checkpoint.ts`
- **File**: `src/application/checkpoint/save-checkpoint.ts`
- **Change**: line 34, `` `.tff/milestones/${milestoneId}/slices/${data.sliceId}` `` → `.tff-cc/…`
- **Run**: `bun run test tests/unit/application/checkpoint/` (if such a spec exists; otherwise skip verification — covered by integration test later)
- **Expect**: PASS or no matching tests
- **AC**: AC2

### T15: Rename artifact path in `load-checkpoint.ts`
- **File**: `src/application/checkpoint/load-checkpoint.ts`
- **Change**: line 15, `.tff/milestones/${milestoneId}/slices/${sliceId}/CHECKPOINT.md` → `.tff-cc/…`
- **Run**: `bun run test tests/unit/application/checkpoint/`
- **Expect**: PASS or no matching tests
- **AC**: AC2

### T16: Rename artifact path in `create-worktree.ts`
- **File**: `src/application/worktree/create-worktree.ts`
- **Change**: line 29, `\`.tff/worktrees/${label}\`` → `\`.tff-cc/worktrees/${label}\``
- **Run**: `bun run test tests/unit/application/worktree/create-worktree.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T17: Rename artifact path in `delete-worktree.ts`
- **File**: `src/application/worktree/delete-worktree.ts`
- **Change**: line 16, `.tff/worktrees/${input.sliceId}` → `.tff-cc/worktrees/${input.sliceId}`
- **Run**: `bun run test tests/unit/application/worktree/delete-worktree.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T18: Rename artifact path in `generate-state.ts`
- **File**: `src/application/sync/generate-state.ts`
- **Change**: line 77, `.tff/STATE.md` → `.tff-cc/STATE.md`
- **Run**: `bun run test tests/unit/application/sync/generate-state.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T19: Rename default `artifactPath` in `journal-entry.builder.ts`
- **File**: `src/domain/value-objects/journal-entry.builder.ts`
- **Change**: line 155, default `.tff/milestones/M01/slices/M01-S04/SPEC.md` → `.tff-cc/milestones/M01/slices/M01-S04/SPEC.md`
- **Run**: `bun run test tests/unit/domain/value-objects/journal-entry.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T20: Rename observation path in `patterns-extract.cmd.ts`
- **File**: `src/cli/commands/patterns-extract.cmd.ts`
- **Change**: line 30, `new JsonlStoreAdapter(".tff/observations")` → `new JsonlStoreAdapter(".tff-cc/observations")`
- **Run**: `bun run typecheck`
- **Expect**: no TS errors
- **AC**: AC6

### T21: Rename observation path in `patterns-aggregate.cmd.ts`
- **File**: `src/cli/commands/patterns-aggregate.cmd.ts`
- **Change**: line 28, same substitution as T20
- **Run**: `bun run typecheck`
- **Expect**: no TS errors
- **AC**: AC6

### T22: Rename observation path in `patterns-rank.cmd.ts`
- **File**: `src/cli/commands/patterns-rank.cmd.ts`
- **Change**: line 28, same substitution as T20
- **Run**: `bun run typecheck`
- **Expect**: no TS errors
- **AC**: AC6

### T23: Rename observation path in `observe-record.cmd.ts`
- **File**: `src/cli/commands/observe-record.cmd.ts`
- **Change**: line 56, same substitution as T20
- **Run**: `bun run typecheck`
- **Expect**: no TS errors
- **AC**: AC6

### T24: Update `hooks/tff-observe.sh`
- **File**: `hooks/tff-observe.sh`
- **Change**: line 6 `SETTINGS=".tff/settings.yaml"` → `".tff-cc/settings.yaml"`; line 23 `OBS_DIR=".tff/observations"` → `".tff-cc/observations"`
- **Run**: `bash -n hooks/tff-observe.sh`
- **Expect**: syntax OK, exit 0
- **AC**: AC6

### T25: Update `hooks/tff-remind.sh`
- **File**: `hooks/tff-remind.sh`
- **Change**: line 6 `SETTINGS=".tff/settings.yaml"` → `".tff-cc/settings.yaml"`
- **Run**: `bash -n hooks/tff-remind.sh`
- **Expect**: syntax OK, exit 0
- **AC**: AC6

### T26: Update `hooks/tff-observe.test.sh`
- **File**: `hooks/tff-observe.test.sh`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' hooks/tff-observe.test.sh` (lines 9, 10, 11, 14, 15, 17, 41)
- **Run**: `bash hooks/tff-observe.test.sh` (runs the test harness)
- **Expect**: exit 0 — hook test still passes end-to-end
- **AC**: AC6

### T27: Update `post-checkout-template.ts`
- **File**: `src/infrastructure/hooks/post-checkout-template.ts`
- **Changes**:
  - Line 4 comment: `# tff post-checkout hook — restores .tff/ state on branch switch` → `# tff post-checkout hook — restores .tff-cc/ state on branch switch`
  - Line 28: `mkdir -p "$CWD_ROOT/.tff"` → `mkdir -p "$CWD_ROOT/.tff-cc"`
  - Line 30: `>> "$CWD_ROOT/.tff/hook.log"` → `>> "$CWD_ROOT/.tff-cc/hook.log"`
- **Run**: `bun run test tests/unit/infrastructure/hooks/post-checkout-template.spec.ts`
- **Expect**: PASS
- **AC**: AC6

### T28: Fix `detectLegacyPattern` in `migration.ts`
- **File**: `src/infrastructure/migration.ts`
- **Change**: line 29, `const tffPath = join(repoRoot, ".tff-cc");` → `const tffPath = join(repoRoot, ".tff");`
- **Run**: `bun run test tests/unit/infrastructure/migration.spec.ts`
- **Expect**: PASS — test already sets up legacy `.tff/` fixtures
- **AC**: AC2

### T29: Fix real-directory detection in `runMigrationIfNeeded` in `migration.ts`
- **File**: `src/infrastructure/migration.ts`
- **Change**: line 102, `const tffPath = join(repoRoot, ".tff-cc");` → `const tffPath = join(repoRoot, ".tff");`
- **Run**: `bun run test tests/unit/infrastructure/migration.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T30: Add user-visible migration log line
- **File**: `src/infrastructure/migration.ts`
- **Change**: in `runMigrationIfNeeded` between steps 2 and 3 (after `ensureProjectHomeDir`, before `copyDir`), insert `console.info(\`[tff] Migrating legacy .tff/ to ${projectHome}\`);`
- **Run**: `bun run test tests/unit/infrastructure/migration.spec.ts`
- **Expect**: PASS
- **AC**: AC2

### T31: Update gitignore comment in `init-project.ts`
- **File**: `src/application/project/init-project.ts`
- **Change**: line 40 comment `// Ensure .tff/ and build/ are in .gitignore so artifacts never land on code branches` → `// Ensure .tff-cc/ and build/ are in .gitignore so artifacts never land on code branches`
- **Run**: `bun run typecheck`
- **Expect**: no TS errors
- **AC**: AC1

### T32: Rename `createTffSymlink` → `createTffCcSymlink` in `home-directory.ts`
- **File**: `src/infrastructure/home-directory.ts`
- **Change**: `sed -i '' 's|createTffSymlink|createTffCcSymlink|g' src/infrastructure/home-directory.ts`. Update doc comments on lines 131-135 to reference `.tff-cc` consistently. Update `// Check if .tff exists` on line 141 → `// Check if .tff-cc exists`.
- **Run**: `bun run typecheck`
- **Expect**: TS errors at caller sites (T33, T34 fix these)
- **AC**: AC1

### T33: Update caller in `create-state-stores.ts`
- **File**: `src/infrastructure/adapters/sqlite/create-state-stores.ts`
- **Change**: `sed -i '' 's|createTffSymlink|createTffCcSymlink|g' <file>` (lines 11, 43)
- **Run**: `bun run typecheck`
- **Expect**: no TS errors for this file
- **AC**: AC1

### T34: Update caller in `worktree-create.cmd.ts`
- **File**: `src/cli/commands/worktree-create.cmd.ts`
- **Change**: `sed -i '' 's|createTffSymlink|createTffCcSymlink|g' <file>` (lines 5, 68)
- **Run**: `bun run typecheck`
- **Expect**: no TS errors anywhere
- **AC**: AC1

### T35: Run full suite — green
- **Run**: `bun run test && bun run lint && bun run typecheck`
- **Expect**: all tests pass, lint clean, typecheck clean
- **AC**: AC2

### T36: Commit Wave 1
- **Files**: all src/ and hooks/ changes
- **Run**: `git add src/ hooks/ && git commit -m "fix: complete .tff/ → .tff-cc/ rename in writers, hooks, and migration detector"`
- **Expect**: single commit containing the implementation half of the rename

---

## Wave 2 — Regression prevention (depends on Wave 1)

### T37: Write path-contract integration test
- **File**: `tests/integration/path-contract.spec.ts` (new)
- **Code**:
  ```typescript
  import { mkdtempSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { execSync } from "node:child_process";
  import { describe, it, expect, afterEach, beforeEach } from "vitest";

  describe("path contract: every artifact lands under .tff-cc/", () => {
    let tmpRepo: string;
    let tffCcHome: string;

    beforeEach(() => {
      tmpRepo = mkdtempSync(join(tmpdir(), "tff-path-contract-"));
      tffCcHome = mkdtempSync(join(tmpdir(), "tff-cc-home-"));
      execSync("git init -q", { cwd: tmpRepo });
      execSync("git commit --allow-empty -m init -q", { cwd: tmpRepo });
    });

    afterEach(() => {
      rmSync(tmpRepo, { recursive: true, force: true });
      rmSync(tffCcHome, { recursive: true, force: true });
    });

    it("init → milestone → slice → checkpoint → sync writes only to .tff-cc/", () => {
      const cli = (cmd: string) =>
        execSync(`node ${process.cwd()}/dist/cli/index.js ${cmd}`, {
          cwd: tmpRepo,
          env: { ...process.env, TFF_CC_HOME: tffCcHome },
          stdio: "pipe",
        }).toString();

      cli("project:init");
      cli('milestone:create --title "M1"');
      // ... capture milestone UUID from output
      // cli(`slice:create --milestone-id ${mid} --title "S1"`);
      // cli(`checkpoint:save --slice-id ${sid}`);
      // cli("sync:state");

      // Walk tmpRepo and assert no real ".tff/" directory
      const entries = readdirSync(tmpRepo, { withFileTypes: true });
      const dotTff = entries.find((e) => e.name === ".tff");
      expect(dotTff, ".tff/ must not exist in repo after project operations").toBeUndefined();

      // Assert .tff-cc/ symlink exists and resolves under TFF_CC_HOME
      const symlinkPath = join(tmpRepo, ".tff-cc");
      expect(existsSync(symlinkPath)).toBe(true);
      expect(statSync(symlinkPath).isDirectory()).toBe(true);
    });
  });
  ```
  Fill in the slice/checkpoint/sync commands by reading current CLI help output; the key assertion is `.tff/` must not exist as a real directory after any operation.
- **Run**: `bun run build && bun run test tests/integration/path-contract.spec.ts`
- **Expect**: PASS
- **AC**: AC3

### T38: Write CI grep guard script
- **File**: `scripts/check-no-legacy-tff-paths.sh` (new)
- **Code**:
  ```sh
  #!/bin/sh
  # Fail if any .tff/ path reference exists outside the migration whitelist.
  # Whitelist: migration.ts (handles legacy migration), migration.spec.ts (tests it),
  #            CHANGELOG.md (historical), docs/superpowers/ (specs describing migration).

  MATCHES=$(grep -rnE '\.tff($|[^-c])' \
    --include='*.ts' --include='*.js' --include='*.sh' \
    --include='*.md' --include='*.yaml' --include='*.yml' \
    --include='*.json' \
    src/ hooks/ workflows/ commands/ skills/ references/ tests/ \
    2>/dev/null \
    | grep -v 'src/infrastructure/migration\.ts' \
    | grep -v 'tests/unit/infrastructure/migration\.spec\.ts' \
    || true)

  if [ -n "$MATCHES" ]; then
    echo "Found legacy .tff/ references outside whitelist:"
    echo "$MATCHES"
    exit 1
  fi
  exit 0
  ```
- **Run**: `chmod +x scripts/check-no-legacy-tff-paths.sh && bash scripts/check-no-legacy-tff-paths.sh`
- **Expect**: exit 0 (no matches outside whitelist after Wave 1)
- **AC**: AC1

### T39: Wire grep guard into CI
- **File**: `.github/workflows/ci.yml`
- **Change**: add step before "Run tests":
  ```yaml
        - name: Guard against legacy .tff/ paths
          run: bash scripts/check-no-legacy-tff-paths.sh
  ```
- **Run**: `yamllint .github/workflows/ci.yml` (if installed; else skip)
- **Expect**: valid YAML
- **AC**: AC1

### T40: Commit Wave 2
- **Run**: `git add tests/integration/ scripts/check-no-legacy-tff-paths.sh .github/workflows/ci.yml && git commit -m "test: add path-contract integration test and CI grep guard"`
- **Expect**: single commit

---

## Wave 3 — UX fix: `slice:create --milestone-id` label → UUID (depends on Wave 1)

### T41: Write failing test for label resolution
- **File**: `tests/unit/cli/commands/slice-create.cmd.spec.ts` (new or extend existing)
- **Code**:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { resolveMilestoneId } from "../../../../src/cli/commands/slice-create.cmd";

  describe("slice:create milestone-id resolution", () => {
    it("accepts M01 label and returns UUID", async () => {
      // Set up milestone store with one milestone labeled M01 → uuid-a
      // const mid = await resolveMilestoneId(store, "M01");
      // expect(mid).toBe("uuid-a");
    });

    it("accepts UUID directly and returns it unchanged", async () => {
      // const mid = await resolveMilestoneId(store, "uuid-a");
      // expect(mid).toBe("uuid-a");
    });

    it("returns error when label does not match any milestone", async () => {
      // const result = await resolveMilestoneId(store, "M99");
      // expect(isErr(result)).toBe(true);
    });
  });
  ```
  Expand with real store fixtures once `resolveMilestoneId` signature is defined in T42.
- **Run**: `bun run test tests/unit/cli/commands/slice-create.cmd.spec.ts`
- **Expect**: FAIL — `resolveMilestoneId` not exported
- **AC**: #92 P2

### T42: Implement label→UUID resolver in `slice-create.cmd.ts`
- **File**: `src/cli/commands/slice-create.cmd.ts`
- **Change**: add `resolveMilestoneId(store, input): Result<string>` — if input matches `/^M\d+$/`, look up by label via `store.listMilestones()` and return UUID; otherwise validate as UUID v4 and return. Call this at the start of the command handler before `store.getMilestone(mid)`.
- **Run**: `bun run test tests/unit/cli/commands/slice-create.cmd.spec.ts`
- **Expect**: PASS
- **AC**: #92 P2

### T43: Update `--help` text for `slice-create.cmd.ts`
- **File**: `src/cli/commands/slice-create.cmd.ts`
- **Change**: in the flag definition (around line 20), update pattern doc and examples to show both forms: `M01` label and UUID. Example: `'slice:create --title "Fix" --milestone-id M01'` and `'slice:create --title "Fix" --milestone-id <uuid>'`.
- **Run**: `node dist/cli/index.js slice:create --help`
- **Expect**: help text shows both accepted forms
- **AC**: #92 P2

### T44: Commit Wave 3
- **Run**: `git add src/cli/commands/slice-create.cmd.ts tests/unit/cli/commands/slice-create.cmd.spec.ts && git commit -m "fix(slice-create): accept milestone label (M01) in addition to UUID"`

---

## Wave 4 — Docs & workflow fixes (parallel, independent of code waves)

Could run alongside Wave 1. Listed here for commit isolation.

### T45: Update `commands/tff/map-codebase.md`
- **File**: `commands/tff/map-codebase.md`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (line 9)
- **Expect**: reference to `.tff-cc/docs/`
- **AC**: AC1

### T46: Update `commands/tff/status.md`
- **File**: `commands/tff/status.md`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (line 12)
- **AC**: AC1

### T47: Update `references/model-profiles.md`
- **File**: `references/model-profiles.md`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (lines 3, 21)
- **AC**: AC1

### T48: Update `references/settings-template.md`
- **File**: `references/settings-template.md`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (line 3)
- **AC**: AC1

### T49: Update `skills/plannotator-usage/SKILL.md`
- **File**: `skills/plannotator-usage/SKILL.md`
- **Change**: `sed -i '' 's|\.tff/|.tff-cc/|g' <file>` (lines 16, 17)
- **AC**: AC1

### T50: Add symlink clarification to `references/conventions.md`
- **File**: `references/conventions.md`
- **Change**: add a note (after the existing `.tff-cc/` description) stating: "Note: `.tff-cc/` in the repo is a symlink to `~/.tff-cc/{projectId}/`, created by `project:init`. Direct `mkdir -p .tff-cc/...` before init is unsafe and will break symlink creation."
- **Expect**: conventions doc explicitly warns against the #91 item 3 foot-gun

### T51: Fix `workflows/new-project.md` ordering
- **File**: `workflows/new-project.md`
- **Change**: line 18, remove `mkdir -p .tff-cc/docs` step entirely — `project:init` creates the directory structure via the symlink. Reorder so `project:init` runs before `map-codebase`.
- **Expect**: workflow no longer creates `.tff-cc/` as a real directory before init

### T52: Fix `workflows/map-codebase.md`
- **File**: `workflows/map-codebase.md`
- **Change**:
  - Line 11: remove `mkdir -p .tff-cc/docs` (assumes init already ran).
  - Line 18: remove `git add .tff-cc/docs/ && git commit -m "docs: map codebase"` (docs live outside repo via symlink; commit is a no-op).
- **Expect**: map-codebase workflow no longer misleads about committing symlinked content

### T53: Run grep guard to verify
- **Run**: `bash scripts/check-no-legacy-tff-paths.sh`
- **Expect**: exit 0
- **AC**: AC1

### T54: Commit Wave 4
- **Run**: `git add commands/ references/ skills/ workflows/ && git commit -m "docs: complete .tff-cc/ rename and fix workflow ordering"`

---

## Wave 5 — `.original.md` backup cleanup (independent)

### T55: Create `scripts/backups/` directory
- **Run**: `mkdir -p scripts/backups/commands/tff scripts/backups/skills scripts/backups/workflows`
- **Expect**: directories exist

### T56: Move `commands/tff/*.original.md` to backups
- **Run**:
  ```sh
  for f in commands/tff/*.original.md; do
    bn=$(basename "$f" .md.original.md)
    git mv "$f" "scripts/backups/commands/tff/${bn}.md.original.md"
  done
  ```
- **Expect**: 30 files moved
- **AC**: AC5

### T57: Move `skills/*/*.original.md` to backups
- **Run**:
  ```sh
  for f in skills/*/*.original.md; do
    rel=${f#skills/}            # <skill>/SKILL.md.original.md
    mkdir -p "scripts/backups/skills/$(dirname "$rel")"
    git mv "$f" "scripts/backups/skills/$rel"
  done
  ```
- **Expect**: 18 files moved
- **AC**: AC5

### T58: Move `workflows/*.original.md` to backups
- **Run**:
  ```sh
  for f in workflows/*.original.md; do
    bn=$(basename "$f")
    git mv "$f" "scripts/backups/workflows/$bn"
  done
  ```
- **Expect**: 23 files moved
- **AC**: AC5

### T59: Verify zero `.original.md` files in load paths
- **Run**: `ls commands/tff/*.original.md skills/*/*.original.md workflows/*.original.md 2>&1 | grep -v 'No such' | wc -l`
- **Expect**: `0`
- **AC**: AC5

### T60: Update `scripts/compress-md.js` docstring
- **File**: `scripts/compress-md.js`
- **Change**: after the existing top-of-file docstring, add:
  ```js
  /**
   * Before running this script, back up the source files to scripts/backups/
   * preserving their relative path (e.g., commands/tff/health.md →
   * scripts/backups/commands/tff/health.md.original.md). The live markdown
   * files under commands/, skills/, and workflows/ are loaded by Claude Code
   * and must not be shadowed by .original.md duplicates.
   */
  ```
- **AC**: AC5

### T61: Commit Wave 5
- **Run**: `git add commands/ skills/ workflows/ scripts/ && git commit -m "chore: move .original.md backups out of Claude Code load paths"`
- **Expect**: single commit with 71 renames + 1 docstring edit

---

## Wave 6 — Release-branch packaging (the risky phase)

### T62: Resolve Open Question — branch-qualified plugin install
- **Research**: check Claude Code plugin install docs. Three possible answers:
  - (a) `claude /plugin install <url>@<branch>` is supported → document `@release` suffix.
  - (b) Not supported, but marketplace.json can declare a branch → use that.
  - (c) Neither supported → skip T63–T68, fall back to **c.2** (distribution repo) in a follow-up PR; leave the plugin packaging issue as a known limitation, ship the rest of this PR.
- **Run**: `gh api repos/anthropics/claude-code/contents/docs/plugins.md --jq .content | base64 -d | grep -i 'branch\|ref\|tag'` (or equivalent docs lookup)
- **Expect**: a definitive answer written into the plan as a note; one of (a), (b), (c) selected. If (c), mark T63–T68 as skipped and stop Wave 6.
- **AC**: AC4

### T63: Write `scripts/sync-release-branch.sh`
- **File**: `scripts/sync-release-branch.sh` (new)
- **Code**:
  ```sh
  #!/bin/sh
  set -e

  # Build release-branch snapshot from current repo state.
  # Requires: dist/ already built (via `bun run build`).

  if [ ! -f dist/cli/index.js ]; then
    echo "dist/cli/index.js missing — run 'bun run build' first"
    exit 1
  fi

  RELEASE_DIR=$(mktemp -d -t tff-release-XXXXXX)
  trap "rm -rf $RELEASE_DIR" EXIT

  # Seed the worktree with main's tree (no history)
  git archive HEAD | tar -x -C "$RELEASE_DIR"

  # Resolve plugin/ symlinks into real copies
  rm -rf "$RELEASE_DIR/plugin"
  mkdir -p "$RELEASE_DIR/plugin/.claude-plugin"
  cp plugin/.claude-plugin/plugin.json "$RELEASE_DIR/plugin/.claude-plugin/"
  for sub in agents commands hooks references skills tools workflows; do
    if [ -e "plugin/$sub" ]; then
      cp -rL "plugin/$sub" "$RELEASE_DIR/plugin/$sub"
    fi
  done

  # Copy built dist/
  cp -r dist "$RELEASE_DIR/dist"

  # Copy native binaries into sqlite adapter path (matches build script)
  if [ -d native ]; then
    mkdir -p "$RELEASE_DIR/dist/infrastructure/adapters/sqlite"
    cp native/*.node "$RELEASE_DIR/dist/infrastructure/adapters/sqlite/" 2>/dev/null || true
  fi

  # Minimal .gitignore that does NOT ignore dist/
  cat > "$RELEASE_DIR/.gitignore" <<'EOF'
  node_modules/
  *.log
  .DS_Store
  EOF

  # Stage and commit to release branch (force-push — branch is a build artifact)
  cd "$RELEASE_DIR"
  git init -q
  git checkout -q -b release
  git add -A
  git -c user.name="tff-release-bot" -c user.email="release@tff-cc.invalid" commit -q -m "release: snapshot built from $(cd - > /dev/null && git rev-parse --short HEAD)"
  cd - > /dev/null

  # Push force to origin release branch
  git -C "$RELEASE_DIR" push --force origin release
  ```
- **Run**: `chmod +x scripts/sync-release-branch.sh && bun run build && bash scripts/sync-release-branch.sh` (locally, against a test remote)
- **Expect**: `release` branch on test remote contains `plugin/` (real files) + `dist/` + `native` content in sqlite adapter dir

### T64: Add sync step to `release.yml`
- **File**: `.github/workflows/release.yml`
- **Change**: after the `Publish to npm` step, add:
  ```yaml
        - name: Sync release branch
          if: ${{ steps.release.outputs.release_created }}
          run: bash scripts/sync-release-branch.sh
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  ```
  Note: default `GITHUB_TOKEN` has `contents: write` per the workflow's existing `permissions` block.
- **Run**: YAML lint (if available)
- **Expect**: valid YAML

### T65: Create `release-branch-validation.yml`
- **File**: `.github/workflows/release-branch-validation.yml` (new)
- **Code**:
  ```yaml
  name: Release Branch Validation

  on:
    push:
      branches: [release]
    schedule:
      - cron: '0 5 * * *'  # daily at 05:00 UTC

  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            ref: release

        - uses: actions/setup-node@v4
          with:
            node-version: '22.x'

        - name: Verify dist/ is present
          run: test -f dist/cli/index.js

        - name: Verify CLI runs
          run: node dist/cli/index.js --version

        - name: Run observe hook smoke
          run: |
            mkdir -p .tff-cc
            echo "enabled: true" > .tff-cc/settings.yaml
            export CLAUDE_TOOL_NAME=Read
            export CLAUDE_SESSION_ID=test-session
            bash hooks/tff-observe.sh < /dev/null || true
            test -d .tff-cc/observations

        - name: Assert no legacy .tff/ artifacts
          run: |
            if [ -d .tff ]; then
              echo "Unexpected .tff/ directory on release branch"
              exit 1
            fi
  ```
- **Run**: YAML lint
- **Expect**: valid YAML

### T66: Update README with install instructions
- **File**: `README.md`
- **Change**: in the install section, document the new install path. Concrete wording depends on T62 outcome:
  - If (a): `claude /plugin install <repo-url>@release`
  - If (b): as-is, but note the marketplace auto-points at the release branch
- **Expect**: README reflects chosen install model
- **AC**: AC4

### T67: Commit Wave 6
- **Run**: `git add scripts/sync-release-branch.sh .github/workflows/ README.md && git commit -m "feat(release): publish built plugin artifacts to release branch"`

### T68: Post-merge verification
- **Not part of PR** — runs after merge to main triggers release-please.
- **Steps**:
  1. Merge PR.
  2. Release-please opens a release PR; merge it.
  3. Release workflow runs; `release-branch-validation.yml` triggers on push to `release`.
  4. If validation green, announce new install path. If red, investigate before announcement.
- **AC**: AC4

---

## Final wave — pre-PR gates

### T69: Full suite green
- **Run**: `bun run lint && bun run typecheck && bun run test && bun run build && bash scripts/check-no-legacy-tff-paths.sh`
- **Expect**: all green

### T70: Create PR
- **Run**:
  ```sh
  git push -u origin fix/complete-tff-cc-migration
  gh pr create --title "fix: complete .tff/ → .tff-cc/ migration (resolves #91, #92)" \
    --body "$(cat docs/superpowers/specs/2026-04-17-tff-cc-migration-completion-design.md | head -50)"
  ```
- **Expect**: PR URL returned; link in #91 and #92

---

## Risks & fallbacks

- **T62 (c) outcome — plugin install doesn't support branch refs.** Skip Wave 6, ship the rest; users continue to manually `bun install` after `/plugin install`. Follow-up PR introduces distribution repo.
- **Migration log line (T30) noise.** If `console.info` proves too chatty, demote to `console.error` gated on `TFF_DEBUG` env var. Cheap fix post-merge.
- **T57's symlink resolution (`cp -rL`).** If `plugin/` contains broken symlinks at release time, `cp -rL` aborts. Mitigation: T63 validates via `readlink -e` before copying, errors with actionable message.

## Out-of-scope (logged as follow-ups)

1. Apply label→UUID resolution to `milestone:close`, `slice:list`, and any other command accepting `--milestone-id`. Same pattern as T42.
2. `compress-md.js` regex footguns (`\bno\b`, `\bor\b` in prose) — script still destructive.
3. Distribution repo (c.2 model) if T62 outcome is (c).
4. Permanent `.gitignore` carve-out for `docs/superpowers/` (currently force-added).
