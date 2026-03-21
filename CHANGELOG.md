# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
