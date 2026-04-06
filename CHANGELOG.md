# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] - 2026-04-06

### Fixed

- **State branch creation now properly reports errors** — Previously, state branch fork/create operations failed silently because the Result type was not being checked
  - `create-milestone.ts`: Now checks Result from `stateBranch.fork()` and logs warning on failure
  - `create-slice.ts`: Now checks Result from `stateBranch.fork()` and logs warning on failure  
  - `init-project.ts`: Now checks Result from `stateBranch.createRoot()` and logs warning on failure

### Changed

- Bumped version to 0.8.1 across all files:
  - `package.json`
  - `plugin/.claude-plugin/plugin.json`
  - `tools/src/cli/index.ts` (CLI version string)

## [0.8.0] - 2026-04-05

### Added

- **M002 — Workflow Adherence & Enforcement:** Graduated enforcement ensuring AI agents follow structured workflows
  - **S01 — Session State Reminder:** Injects context at session start (milestone, slice, phase, wave position)
  - **S02 — Workflow Guard Hook:** PreToolUse detection of direct edits without `/tff:quick`, injects advisory warnings
  - **S03 — Phase Boundary Detection:** SPEC.md edit detection outside `/tff:discuss` workflow with recovery hints
  - **S04 — Pre-Op Validation Gates:** Hard BLOCK on `/tff:*` commands when status prerequisites not met
  - **S05 — State Machine Enforcement:** Invalid slice transitions rejected with valid next-step guidance
- **M001 — State Sync & Recovery Infrastructure:** Tiered crash recovery and synchronization
  - **S01 — Journal System + T1 Recovery:** Task lifecycle journal with checkpoint replay
  - **S02 — Lockfile Serialization:** Concurrent sync operations serialize safely
  - **S03 — State Consistency Gates:** Branch guard with `BRANCH_MISMATCH` errors
  - **S04 — T2/T3 Recovery + `/tff:repair`:** Tiered recovery for complete state restoration
- **Plugin Distribution:** Zero-install CLI with native bindings for 5 platforms
- **Compressed Notation:** Formal logic symbols (∀∃∈∧∨¬) applied to markdown files

### Infrastructure

- 1582 tests passing (Node 20 & 22)
- `.gsd/` → `.tff/` references updated in source code

## [0.7.0] - 2026-03-23

### Added

- **S01**: 5 new skills from agent conversions (stress-testing-specs, architecture-review, acceptance-criteria-validation, codebase-documentation, skill-authoring)
- **S02**: 2 new skills from superpowers (verification-before-completion, receiving-code-review)
- **S03**: 3 new skills for plan/execute/ship (writing-plans, executing-plans, finishing-work)
- **S05**: Agent-authoring skill with standardized template
- **S09**: `layer-rules.md` supporting file for hexagonal-architecture

### Changed

- **S04**: 4 skill rewrites with HARD-GATE + enhanced commit-conventions (TDD, systematic-debugging, brainstorming, code-review-protocol)
- **S06**: 4 agents rewritten as lean identity-only; 9 agents deleted (methodology moved to skills)
- **S07**: All 13+ workflows updated to use skill-loading instead of agent-spawning
- **S08**: Config extraction (beads.timeout, autonomy.max-retries, jaccard-threshold), validate-skill allowlist security fix
- **S09 — Skills Architecture Reform**: All 18 skills restructured from `skills/<name>.md` to `skills/<name>/SKILL.md` folder convention; all skills decoupled from TFF-specific commands, paths, agent names, and tier terminology (S-tier/F-lite/F-full → simple/standard/complex); `token-budget` frontmatter removed; hexagonal-architecture fully rewritten with DDD + CQRS patterns; all references updated across workflows, agents, README, and integration tests
- **Agent count**: 13 → 4 (lean identity-only agents; methodology now in skills)

### Security

- **S08**: validate-skill allowlist restricts command patterns

## [0.6.0] - 2026-03-22

### Added

- **R02 — riskLevel signal:** Complexity classification now detects risk signals (concurrency, security, data migration) that force automatic tier upgrades (S09)
- **S06 — Git hooks:** lefthook pre-commit with biome lint/format checks
- **S08 — CI expansion:** CI pipeline runs on all PRs with lint step
- **S10/S11 — Cleanup automation:** Auto-rebase milestone branch on slice close

### Changed

- **R01 — Classification timing:** Classification moved to end of discuss phase; orchestrator proposes tier, user confirms via AskUserQuestion (S02)
- **R02 — S-tier criteria:** S-tier restricted to single-file changes, no new files, no architecture impact, root cause known (S01)
- **R03 — User-confirmed classification:** `slice:classify` output is a suggestion, not auto-routing; no workflow step auto-skipped (S02, S03)
- **R04 — Unified pipeline:** All tiers follow same pipeline (discuss → research → plan → execute → verify → ship); tiers control depth, not skipping (S03)
- **R05 — Quick/debug alignment:** Quick and debug become entry-point shortcuts that converge on standard plan → execute → ship (S04)
- **Removed `.tff/` from git tracking** — internal project state is no longer version-controlled

### Fixed

- **R06 — Milestone numbering:** Fixed to use `--all` flag for closed beads in numbering scans (S05)

## [0.5.3] - 2026-03-22

### Added

- Bead-vs-PR reconciliation in `/tff:health` — detects stale beads whose PRs are already merged
- Error handling convention (rule 6) in orchestrator pattern — all tff-tools calls must check `ok` field
- Explicit error checks after state transitions in discuss, research, plan, execute, verify workflows
- Plan Review column in complexity tiers — plannotator review mandatory for ALL tiers including S-tier

### Changed

- **Directory restructure**: `.tff/slices/<id>/` → `.tff/milestones/<M0X>/slices/<id>/`
- **Requirements scoped per milestone**: `.tff/REQUIREMENTS.md` → `.tff/milestones/<M0X>/REQUIREMENTS.md`
- `quick.md` and `debug.md` now include plannotator-annotate plan review step (was skipped)
- `discuss-slice.md` S-tier shortcut skips discuss+research but still requires plan approval
- `milestone:create` derives number from highest existing `M(\d+)` instead of count (same as S12 slice fix)

### Fixed

- Milestone numbering: `milestone:create` produced duplicate M01 because `bd list` excludes closed beads
- Path traversal guard in `MarkdownArtifactAdapter.resolve()` — rejects `../` escape attempts
- Dolt remote validation — `doltPush`/`doltPull` reject non-alphanumeric remote names (prevents flag injection)

### Security

- Path traversal: resolved path must start with basePath (defense-in-depth)
- Dolt remote: validates against `^[a-zA-Z0-9_-]+$` before `execFile`

## [0.5.2] - 2026-03-22

### Changed

- Project init (`/tff:new`) no longer creates requirements or first milestone — just PROJECT.md + settings.yaml, then suggests `/tff:new-milestone`
- Requirements are now scoped per-milestone, written during `/tff:new-milestone`

### Fixed

- All shipping workflows (ship, quick, debug, complete-milestone) now close beads after PR merge via AskUserQuestion merge gate
- complete-milestone closes all slice beads (verifying PR merge status) before creating milestone PR
- Removed impossible "all slices closed" prerequisite from complete-milestone (replaced by auto-closure step)

## [0.5.1] - 2026-03-22

### Fixed

**CLI Tooling (R01)**
- S01: Corrected misused error codes and version drift across CLI commands
- S04: Replaced hardcoded 2s init delay with readiness retry loop (up to 5 attempts)
- S12: Derive slice number from highest existing ID instead of bead count
- S14: Parse `--title` flag and skip unknown flags in `slice:create` (was treating `--milestone` as slice name)

**Dual-State Coordination (R03)**
- S03: Fixed `InMemoryBeadStore.ready()` dependency resolution and typed dolt-sync
- S06: Read actual bead status in `slice:transition` instead of stale cached value
- S07 (beads): Register tff custom statuses with beads on project init

**Workflow Orchestration (R02)**
- S07 (plannotator): Standardized all plannotator invocations to use Skill tool instead of raw bash commands (5 workflows + skill reference)
- S09: Enforce `.tff/worktrees/` path in quick and debug workflows with explicit `tff-tools worktree:create` calls
- S11: Make auto-transition instructions explicit in all workflows (read settings, check autonomy mode)

**Observability (R06)**
- S02: Added `tffWarn` helper and surfaced swallowed errors in beads adapter
- S13: Fixed PostToolUse hook path resolution — use `${CLAUDE_PLUGIN_ROOT}` instead of relative path

**Dual-State Persistence (R03)**
- S10: Auto-generate STATE.md and save checkpoints after slice transitions

**Documentation**
- S05: Fixed Dolt remote setup instructions in new-project workflow

**Security**
- Removed `.beads/.beads-credential-key` from git tracking and added to `.gitignore`

## [0.5.0] - 2026-03-22

### Added

**Debug Flow**
- `/tff:debug` command — two-phase diagnose→fix workflow for systematic bug investigation
- `debugging-methodology` skill — Track A (reproducible error) and Track B (symptom-based) diagnostic methodology
- Phase 1 (diagnose) runs without creating a slice; Phase 2 creates S-tier slice only after root cause confirmed
- External root cause detection — exits with diagnostic report and workaround suggestions instead of entering fix phase

**Existing-Repo Onboarding**
- `/tff:new` detects existing source files via common extension heuristic (23 extensions)
- Consent-gated codebase analysis — runs `map-codebase` only with user approval
- Synthesizes proposed project name, vision, and requirements from generated docs
- Pre-fills project setup with user-validated values; graceful fallback on analysis failure
- `map-codebase` prerequisite relaxed to allow running before project init

**Settings UX**
- Default `settings.yaml` generated during `/tff:new` with inline YAML comments explaining every field
- `references/settings-template.md` — canonical commented template (single source of truth)
- `/tff:settings` expanded to manage all sections: model-profiles, autonomy, auto-learn, dolt
- Missing-field detection — offers to add new fields with defaults to existing configs
- `ProjectSettingsSchema` — full-file Zod schema with resilient per-field defaults via `.catch()`
- `loadProjectSettings()` — end-to-end YAML string → settings with graceful corruption handling

### Changed

- Autonomy default changed from `plan-to-pr` to `guided` (safest for new projects)
- `/tff:settings` description updated to reflect expanded scope

### Fixed

- Dolt auto-sync in `slice-transition.cmd.ts` replaced naive `includes('auto-sync: true')` substring matching with proper parsed settings — commented-out dolt config no longer falsely triggers sync

## [0.4.0] - 2026-03-21

### Added

**Team Portability (Plan C)**
- Beads-to-git snapshot serialization (`snapshot:save`, `snapshot:load`, `snapshot:merge`)
- Delta-based JSONL snapshots with periodic compaction on `/tff:sync`
- Auto-snapshot on every slice transition
- `MarkdownBeadAdapter` -- full `BeadStore` implementation for graceful degradation without Dolt
- `bead-adapter-factory` -- auto-detects bd availability, falls back to markdown-only mode
- 12 CLI commands migrated from hardcoded `BdCliAdapter` to factory
- 3-way entity-level snapshot merge with git merge driver (`.gitattributes`)
- Field-level conflict resolution: status (latest ts), design (flag conflict), deps (union), kvs (latest ts)
- `CONFLICT.md` generated for design conflicts requiring human resolution
- Clone-and-go: `/tff:init` hydrates beads from existing snapshot
- Dolt remote sync utilities (`doltPush`, `doltPull`, `shouldAutoSync`)
- Auto-push to Dolt remote on transitions when configured
- Guided Dolt remote setup during `/tff:new` (DoltHub, self-hosted, or skip)
- Git merge driver setup in `/tff:new` workflow
- Health check reports adapter mode (`beads: active` vs `beads: unavailable (markdown-only)`)
- `BeadStore` port contract tests (18 tests, reusable across adapters)
- `BeadSnapshot` value object with `createSnapshot`, `latestById`

**Interactive Design & Granular Planning (Plan D)**
- New `interactive-design` skill -- conversation methodology, spec templates (F-lite/F-full), spec-document-reviewer and plan-document-reviewer prompt templates
- Discuss workflow rewritten: orchestrator drives Q&A via AskUserQuestion → produces `SPEC.md`
- Brainstormer repurposed as spec challenger (F-full only), spawned after spec is drafted
- Product-lead validates acceptance criteria (∀ criterion: testable ∧ binary)
- Anonymous spec-document-reviewer dispatched via Agent tool (max 3 iterations)
- User gate before transition to researching
- Plan workflow rewritten: reads SPEC.md, maps file structure, produces bite-sized TDD tasks with exact code/paths/commands
- Task-to-acceptance-criteria traceability (AC1, AC2...)
- Anonymous plan-document-reviewer dispatched via Agent tool (max 3 iterations)
- Orchestrator pattern updated with conversation-driven workflow exception
- `SPEC.md` added to project directory conventions

### Changed

- Brainstormer agent: now purely spec challenger (removed legacy discussion driver mode)
- Beads positioned as essential: degraded mode warns users with clear install guidance
- All new content compressed with V3 formal notation style

### Fixed

- Marketplace.json: removed `version` field (not needed for CC plugin updates, caused stale cache)

## [0.3.1] - 2026-03-21

### Fixed

- Removed `version` from marketplace.json (not needed for CC plugin updates, caused stale cache issues)

## [0.3.0] - 2026-03-21

### Added

**Agent Intelligence**
- All 13 agents enriched with **Personality**, **Methodology**, and **Reads Before Acting** sections
- `tff-skill-drafter` agent (13th agent, added in 0.2.0) now has full personality profile
- `references/security-baseline.md` -- STRIDE threat categories and OWASP Top 10 quick reference for security-auditor

**Smarter Context Management**
- Token budget tiers (`critical` / `workflow` / `background`) on all 5 skill files
- Workflow SPAWN instructions rewritten to pass role-specific context (not full slice context)

**Auto-Learn Pipeline Hardening**
- Refinement cooldown metadata (`canRefine`, `recordRefinement`) with configurable 7-day cooldown
- Configurable scoring weights in `rankCandidates` (frequency, breadth, recency, consistency)
- Density-based clustering with Jaccard distance (replaces simple 70% co-activation threshold)
- Skill validation expansion: size limits, name collision detection, shell injection pattern warnings
- Property-based tests for scoring weight stability (fast-check)

**Autonomous Flow (plan-to-pr mode)**
- `autonomy.mode` setting: `guided` (V2 behavior) or `plan-to-pr` (auto-run from plan approval to PR)
- Workflow chaining: `nextWorkflow()` and `shouldAutoTransition()` use cases
- Escalation tasks: blocked agents create structured escalation context instead of stalling
- Auto-retry on verify failure (max 2, then escalate)
- Auto-fix loop on review findings (max 2 cycles, then escalate)
- Progress notifications: `[tff] M01-S02: <from> → <to>` at each transition
- 2 new CLI commands: `workflow:next`, `workflow:should-auto`

**Code Robustness**
- Git adapter TTL cache for `getCurrentBranch`/`getHeadSha` with invalidation on writes
- Beads adapter retry with exponential backoff (3 attempts, 500ms base, 4s max)
- Observation hook dead-letter resilience (failed appends captured, replayed on next success)
- Stricter beads `normalizeBeadData` validation (explicit checks for id/status fields)
- Sync reconciliation decomposed into testable helpers: `resolveContentConflict`, `resolveStatusConflict`, `detectOrphans`
- New status reconciliation behavior (bead wins for status -- previously only content was synced)
- Wave detection cycle errors now name the specific tasks involved
- Sort determinism documented in wave detection

**Test Coverage**
- 384 tests across 92 test files (up from ~300 in 0.2.0)
- Property-based tests for scoring (fast-check)
- Sync edge case tests (empty, partial, large orphan sets)
- Autonomous flow integration test (validates chain against state machine)
- Dead-letter shell test for observation hook
- Beads adapter retry tests
- Git adapter caching tests

### Changed

- All 13 agent `.md` files compressed with formal notation (∀, ∃, ∈, ∧, ∨, →) -- **45% character reduction**
- All 5 skill `.md` files compressed -- **31% character reduction**
- All 22 workflow `.md` files compressed -- **48% character reduction**
- Total markdown compression: **76,566 → 42,860 chars (45% reduction)**
- `detectClusters` API changed: accepts `Observation[]` instead of `CoActivation[]`
- `normalizeBeadData` now returns `Result<BeadData, DomainError>` instead of raw `BeadData`
- Auto-learn workflow CLI args now read from `.tff/settings.yaml`

### Fixed

- Configurable `minCount` in `aggregatePatterns` (was hardcoded default only)
- `checkDrift` custom `maxDrift` parameter verified working for 0.2 override

## [0.2.0] - 2026-03-21

### Added

- `sync:reconcile` -- full bidirectional markdown/beads reconciliation (5 new tests)
- Release checklist reference document (`references/release-checklist.md`)
- PR URLs always shown to user in ship-slice and complete-milestone workflows

### Changed

- **Beads adapter aligned with real `bd` CLI API** (validated against bd v0.61.0):
  - `bd create`: positional title, `-l` for labels, `--no-inherit-labels`
  - `bd show`: handle array response, normalize snake_case to camelCase
  - `bd dep add`: correct syntax (was `bd link`)
  - `bd update --claim`: atomic task claiming
  - `bd ready`: list unblocked tasks
  - `bd close --reason`: close with reason
  - `--stdin` support for descriptions with special characters
  - Increased timeout to 30s for Dolt auto-start
- Entity IDs changed from `z.uuid()` to `z.string().min(1)` (beads uses hash IDs, not UUIDs)
- `milestone:create` auto-detects project bead ID and auto-numbers milestones
- `slice:create` auto-detects active milestone and auto-numbers slices
- `project:init` calls `bd init --quiet` (idempotent) with stabilization delay
- Removed `review:record` CLI command (16 commands total, was 17)
- Plugin restructured for CC marketplace: `plugin/` subdirectory with symlinks
- tff **never merges** -- only creates PRs. User merges via GitHub.

### Fixed

- Hooks rewritten: removed Node.js hooks (caused PostToolUse/SessionStart errors), empty hooks.json
- Fixed label inheritance pollution (`--no-inherit-labels` in `bd create`)
- Fixed `normalizeBeadData` to find first `tff:` label in labels array
- Fixed build script: `tsup --config tools/tsup.config.ts`
- Fixed Zod v4 deprecation: `z.string().uuid()` replaced with `z.uuid()` then `z.string().min(1)`

### Removed

- `docs/` removed from git tracking (internal design specs/plans)
- Context monitor hook (caused errors, no bridge file writer exists)
- Dependency check hook (caused startup errors)

## [0.1.0] - 2026-03-21

### Added

**Domain Layer**
- `Result<T, E>` monad with `Ok`, `Err`, `isOk`, `isErr`, `match`
- Domain error types: `PROJECT_EXISTS`, `INVALID_TRANSITION`, `SYNC_CONFLICT`, `FRESH_REVIEWER_VIOLATION`, `NOT_FOUND`
- Domain events: `SLICE_PLANNED`, `SLICE_STATUS_CHANGED`, `TASK_COMPLETED`, `SYNC_CONFLICT`
- Value objects: `ComplexityTier` (S/F-lite/F-full), `SliceStatus` (state machine), `BeadLabel`, `CommitRef`, `Wave`, `SyncReport`
- Entities: `Project` (singleton per repo), `Milestone`, `Slice` (with state machine transitions), `Task` (with start/complete)
- Ports: `BeadStore`, `ArtifactStore`, `GitOps`, `ReviewStore`

**Application Layer**
- `initProject` -- singleton project enforcement
- `getProject` -- retrieve project data
- `createMilestone` / `listMilestones` -- milestone management with git branches
- `createSlice` -- slice creation with bead + markdown
- `transitionSlice` -- state machine transitions with bead sync
- `classifyComplexity` -- S/F-lite/F-full heuristic
- `detectWaves` -- topological sort for wave-based parallelism
- `enforceFreshReviewer` -- reviewer must not be executor
- `generateState` -- derive STATE.md from beads
- `saveCheckpoint` / `loadCheckpoint` -- execution resumability

**Infrastructure**
- `MarkdownArtifactAdapter` -- filesystem adapter for `.tff/` artifacts
- `BdCliAdapter` -- beads CLI wrapper
- `GitCliAdapter` -- git CLI wrapper with worktree support
- `ReviewMetadataAdapter` -- review tracking via beads KV
- In-memory test adapters for all ports

**CLI (`tff-tools.cjs`)**
- 16 commands: `project:init`, `project:get`, `milestone:create`, `milestone:list`, `slice:create`, `slice:transition`, `slice:classify`, `waves:detect`, `sync:state`, `sync:reconcile`, `worktree:create`, `worktree:delete`, `worktree:list`, `review:check-fresh`, `checkpoint:save`, `checkpoint:load`

**Plugin Layer**
- 24 slash commands (`/tff:new` through `/tff:help`, plus `/tff:quick`, `/tff:status`, `/tff:map-codebase`)
- 12 agent definitions (brainstormer, architect, product-lead, backend-dev, frontend-dev, devops, tester, code-reviewer, spec-reviewer, security-auditor, fixer, doc-writer)
- 17 workflow files (full lifecycle orchestration)
- 5 reference documents (conventions, model profiles, agent status protocol, orchestrator pattern, next-steps)
- 5 skills (hexagonal-architecture, test-driven-development, code-review-checklist, commit-conventions, plannotator-usage)
- CC marketplace manifest with `./plugin` source path

### Not Yet Implemented

- Skill auto-learn pipeline (designed, implementation pending)
