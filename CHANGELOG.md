# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- `recordReview` -- store review metadata
- `generateState` -- derive STATE.md from beads
- `saveCheckpoint` / `loadCheckpoint` -- execution resumability

**Infrastructure**
- `MarkdownArtifactAdapter` -- filesystem adapter for `.tff/` artifacts
- `BdCliAdapter` -- beads CLI wrapper
- `GitCliAdapter` -- git CLI wrapper with worktree support
- `ReviewMetadataAdapter` -- review tracking via beads KV
- In-memory test adapters for all ports

**CLI (`tff-tools.cjs`)**
- 17 commands: `project:init`, `project:get`, `milestone:create`, `milestone:list`, `slice:create`, `slice:transition`, `slice:classify`, `waves:detect`, `sync:state`, `sync:reconcile`, `worktree:create`, `worktree:delete`, `worktree:list`, `review:record`, `review:check-fresh`, `checkpoint:save`, `checkpoint:load`

**Plugin Layer**
- 21 slash commands (`/tff:new` through `/tff:help`)
- 10 agent definitions (brainstormer, architect, product-lead, backend-dev, frontend-dev, devops, tester, code-reviewer, security-auditor, fixer)
- 15 workflow files (full lifecycle orchestration)
- 2 reference documents (conventions, model profiles)
- Hooks: SessionStart dependency check, PostToolUse context monitor
- CC marketplace manifest

**Agent & Skill Improvements**
- Agent status protocol (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT)
- Orchestrator pattern reference for lightweight workflows
- Next-step suggestions in all 16 workflows
- Two-stage review in ship workflow (spec compliance then code quality)
- tff-spec-reviewer agent for spec compliance verification
- tff-doc-writer agent with parallel codebase mapping
- Skill library: hexagonal-architecture, test-driven-development, code-review-checklist, commit-conventions, plannotator-usage
- `/tff:map-codebase` command with parallel doc-writer agents
- `/tff:quick` S-tier shortcut command
- `/tff:status` lightweight status command
- All 10 agents enriched with personas, guardrails, deliverables, and status protocol
- Beads adapter fix: `bd dep add` instead of `bd link`

### Not Yet Implemented

- `sync:reconcile` -- full bidirectional markdown/beads reconciliation (deferred)
- Skill auto-learn pipeline
