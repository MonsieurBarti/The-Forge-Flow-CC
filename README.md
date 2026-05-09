<p align="center">
  <img src="assets/forge-banner.png" alt="The Forge Flow" width="800" />
</p>

<h1 align="center">The Forge Flow</h1>

<p align="center">
  Autonomous coding agent orchestrator for Claude Code.<br/>
  SQLite-backed state. Plannotator reviews. Wave-based parallel execution.
</p>

<p align="center">
  <a href="#setup-guide">Setup</a> |
  <a href="#full-workflow-example">Workflow</a> |
  <a href="#commands">Commands</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#agents">Agents</a>
</p>

---

## What is The Forge Flow?

The Forge Flow (`tff-cc`) is a Claude Code plugin that orchestrates AI agents through a structured software development lifecycle. It coordinates 4 lean agents and 18 skills from project initialization to shipped code.

**Key features:**
- **SQLite state** — zero-dependency local state management with automatic persistence
- **Wave-based execution** -- tasks are topologically sorted into waves, independent tasks run in parallel
- **Fresh reviewer enforcement** -- code reviewers are never the same agent that wrote the code
- **Plannotator integration** -- all plan reviews, verification, and code reviews go through plannotator's interactive UI
- **Complexity tiers** -- S (quick fix), SS (feature), SSS (complex) determine which phases are required
- **Checkpoint/resumability** -- pause and resume execution across sessions
- **Skill library** -- 18 reusable methodology skills that agents load for consistent practices
- **Autonomous flow** -- `plan-to-pr` mode auto-runs from plan approval through PR creation, with escalation on failure
- **Auto-learn pipeline** -- observes tool-use patterns, ranks candidates, drafts skills with bounded guardrails
- **Lean agents** -- 4 identity-only agents for fresh-reviewer enforcement; all methodology lives in skills

---

## Setup Guide

The Forge Flow requires **Node.js 20+** and **Git**. Optionally install **plannotator** for interactive review UI.

### Step 1: Install plannotator

Plannotator is a Claude Code plugin that provides an interactive browser UI for reviewing plans and code.

```bash
# Add the plannotator marketplace
claude /plugin marketplace add backnotprop/plannotator

# Install the plugin
claude /plugin install plannotator@plannotator
```

Verify: Run `/plannotator-annotate README.md` in Claude Code -- it should open a browser window.

### Step 2: Install The Forge Flow

```bash
# Add the marketplace
claude /plugin marketplace add MonsieurBarti/The-Forge-Flow-CC

# Install the plugin
claude /plugin install tff-cc@the-forge-flow
```

Verify: Run `/tff:help` in Claude Code to see the command reference.

The plugin is pulled from the repo's `release` branch, which ships a pre-built `dist/` and resolved plugin tree — no manual `bun install` or `bun run build` is required on the consumer side. Contributors cloning `main` for development still need `bun install && bun run build` to produce `dist/` locally.

### Verification

Run `/tff:health` to check state consistency and plannotator availability.

---

## Full Workflow Example

Here's a complete walkthrough from empty project to shipped milestone: building an authentication system.

### 1. Initialize the project

```
/tff:new
```

Claude asks for your project name and vision. You provide:
- **Name:** my-saas-app
- **Vision:** A multi-tenant SaaS platform with team management

This creates `.tff-cc/PROJECT.md` and asks you to define requirements.

**Next step suggested:** `/tff:new-milestone`

### 2. Create a milestone

```
/tff:new-milestone
```

- **Name:** MVP
- **Goal:** Basic auth + team CRUD

This creates the `milestone/M01` branch and prompts you to break the milestone into slices.

You define 3 slices:
1. **Auth flow** -- signup, login, JWT tokens
2. **Team CRUD** -- create/read/update/delete teams
3. **Permissions** -- role-based access control

**Next step suggested:** `/tff:discuss`

### 3. Discuss the first slice

```
/tff:discuss
```

The **brainstormer** agent (opus) challenges your assumptions:
- "What OAuth providers do you need? Just email/password?"
- "How do JWT tokens refresh? What's the expiry strategy?"
- "Is email verification required for MVP?"

The **product-lead** agent validates requirements and defines acceptance criteria.

Complexity is auto-classified as **SS** (5 tasks, 2 modules, no external integrations).

**Next step suggested:** `/tff:research M01-S01`

### 4. Research (optional for SS)

```
/tff:research M01-S01
```

The agent investigates the technical approach: reads the existing codebase, checks what auth libraries are available, documents findings in `.tff-cc/milestones/M01/slices/M01-S01/RESEARCH.md`.

**Next step suggested:** `/tff:plan M01-S01`

### 5. Plan the slice

```
/tff:plan M01-S01
```

The agent creates a task decomposition with dependencies:
- T01: User entity + migration (no deps)
- T02: Password hashing service (no deps)
- T03: Signup endpoint (depends on T01, T02)
- T04: Login endpoint (depends on T01, T02)
- T05: JWT middleware (depends on T04)

Waves detected:
- Wave 0: [T01, T02] -- parallel
- Wave 1: [T03, T04] -- parallel
- Wave 2: [T05] -- sequential

**Plannotator opens** in your browser. You annotate the plan, suggest changes, approve.

A worktree is created at `.tff-cc/worktrees/M01-S01/` on branch `slice/M01-S01`.

**Next step suggested:** `/tff:execute M01-S01`

### 6. Execute with wave parallelism

```
/tff:execute M01-S01
```

For each wave:

**Wave 0:** The **tester** agent writes failing specs for T01 and T02. Then **backend-dev** agents are spawned in parallel -- one for T01 (user entity), one for T02 (password hashing). Each implements until tests pass, then commits atomically.

**Wave 1:** Same pattern for T03 and T04. Tests written first, then implementation.

**Wave 2:** T05 (JWT middleware) -- sequential, single agent.

Checkpoints are saved after each wave. If the session crashes, `/tff:resume` picks up where it left off.

**Next step suggested:** `/tff:verify M01-S01`

### 7. Verify acceptance criteria

```
/tff:verify M01-S01
```

The **product-lead** agent checks each acceptance criterion against the implementation. Results are written to `VERIFICATION.md`.

**Plannotator opens** for you to review the findings. You mark any issues.

If all pass: **Next step suggested:** `/tff:ship M01-S01`
If failures: suggests `/tff:execute M01-S01` to fix and re-run.

### 8. Ship the slice (two-stage review)

```
/tff:ship M01-S01
```

**Stage 1 -- Spec compliance:** The **spec-reviewer** agent (fresh, never wrote this code) verifies every acceptance criterion is met in the actual code.

**Stage 2 -- Code quality:** The **code-reviewer** agent checks quality, patterns, tests, YAGNI. Only runs after spec passes.

**Security audit:** The **security-auditor** agent checks for OWASP top 10 issues.

**Plannotator opens** for your final code review.

If approved: slice PR is created (`slice/M01-S01` -> `milestone/M01`), merged, worktree cleaned up.

**Next step suggested:** `/tff:discuss` (for the next slice) or `/tff:progress`

### 9. Repeat for remaining slices

Run the same cycle for M01-S02 (Team CRUD) and M01-S03 (Permissions).

### 10. Complete the milestone

```
/tff:audit-milestone
```

Checks all slices are closed, requirements are covered. Then:

```
/tff:complete-milestone
```

Creates the milestone PR (`milestone/M01` -> `main`), runs a final security audit, opens plannotator for review. After approval, merges to main.

**Next step suggested:** `/tff:new-milestone` for the next milestone.

### Quick fixes and debugging

Found a bug while working on a later slice? Two options:

**If you know the fix:**
```
/tff:quick "Fix null pointer in user validation"
```
Skips brainstorming and research, goes straight to plan -> execute -> ship.

**If you need to investigate:**
```
/tff:debug "Users getting 500 on login after password reset"
```
Systematically diagnoses the issue first (no slice created), then fixes via S-tier slice once root cause is confirmed.

---

## Commands

### Project Lifecycle

| Command | Description |
|---|---|
| `/tff:new` | Initialize a new tff project |
| `/tff:new-milestone` | Start a new milestone |
| `/tff:progress` | Show status dashboard |
| `/tff:status` | Lightweight status with next step |

### Slice Lifecycle

| Command | Description |
|---|---|
| `/tff:discuss` | Brainstorm and scope a slice |
| `/tff:research [slice-id]` | Research phase |
| `/tff:plan [slice-id]` | Plan and create tasks |
| `/tff:execute [slice-id]` | Execute with wave parallelism |
| `/tff:verify [slice-id]` | Verify acceptance criteria |
| `/tff:ship [slice-id]` | PR review and merge slice |
| `/tff:quick <description>` | Fast-track S-tier changes |
| `/tff:debug <error or symptom>` | Diagnose and fix a bug systematically |

### Milestone Lifecycle

| Command | Description |
|---|---|
| `/tff:audit-milestone` | Audit against original intent |
| `/tff:complete-milestone` | PR review and merge to main |

### Management

| Command | Description |
|---|---|
| `/tff:add-slice` | Add slice to milestone |
| `/tff:insert-slice` | Insert between slices |
| `/tff:remove-slice` | Remove future slice |
| `/tff:rollback [slice-id]` | Revert slice commits |
| `/tff:pause` | Save checkpoint |
| `/tff:resume` | Restore from checkpoint |
| `/tff:sync` | Regenerate STATE.md |
| `/tff:health` | Diagnose state consistency |
| `/tff:settings` | View and modify all project settings |
| `/tff:map-codebase` | Analyze codebase and generate docs |
| `/tff:help` | Show command reference |

### Skill Auto-Learn

| Command | Description |
|---|---|
| `/tff:detect-patterns` | Run pattern detection pipeline |
| `/tff:suggest-skills` | Show ranked skill candidates |
| `/tff:create-skill` | Draft skill from pattern or description |
| `/tff:learn` | Detect skill divergences and propose refinements |
| `/tff:compose` | Detect and bundle skill clusters |

## Architecture

```
the-forge-flow/
  .claude-plugin/         # CC marketplace manifest
  commands/tff/           # 30 slash commands (.md)
  agents/                 # 4 lean identity-only agents (.md)
  skills/                 # 18 reusable methodology skills (folder convention)
  workflows/              # 23 orchestration workflows (.md)
  references/             # 8 reference documents (.md)
  hooks/                  # PostToolUse observation hook (.sh)
  src/
    domain/               # Hexagonal domain layer (Zod, Result<T,E>)
    application/          # Use cases (orchestrate domain via ports)
    infrastructure/       # Adapters (SQLite, git CLI, filesystem)
    cli/                  # CLI entry point
  dist/                   # Compiled CLI and native bindings
  tests/                  # Unit and integration tests
```

### Hexagonal Rules

- **Domain** imports only Zod + `node:crypto`. No infrastructure.
- **Zod as single source of truth** -- `z.infer<typeof Schema>` everywhere, no TS `enum`.
- **Result\<T, E\>** for all fallible operations. Never throw.
- **Ports** define interfaces in domain. Adapters implement in infrastructure.
- **Tests** colocated as `.spec.ts`. Unit tests use in-memory adapters.

## Agents

After v0.7.0's skills architecture reform, methodology moved from agents to skills. Only 4 identity-only agents remain -- they exist for fresh-reviewer enforcement (ensuring the reviewer is never the same agent that wrote the code).

| Agent | Role | Profile |
|---|---|---|
| code-reviewer | Code quality review (fresh reviewer) | quality (opus) |
| spec-reviewer | Spec compliance verification | quality (opus) |
| security-auditor | Security review on every PR | quality (opus) |
| fixer | Apply accepted review findings | budget (sonnet) |

## Skills

Skills are reusable knowledge fragments loaded via `@skills/<name>/SKILL.md`. They teach HOW to do something -- agents define WHO does it. After v0.7.0, all methodology lives in skills (decoupled from TFF-specific terminology).

| Skill | Purpose |
|---|---|
| hexagonal-architecture | DDD + CQRS + hexagonal boundary patterns |
| test-driven-development | TDD methodology with HARD-GATE enforcement |
| code-review-protocol | Two-stage review (spec compliance + code quality) |
| commit-conventions | Conventional commit format and rules |
| plannotator-usage | Interactive plan/review UI integration |
| brainstorming | Structured discovery and design exploration |
| systematic-debugging | 4-phase investigation (Track A/B diagnosis) |
| writing-plans | Break specs into bite-sized tasks (2-5 min each) |
| executing-plans | Wave-based execution with fresh subagent per task |
| finishing-work | Pre-PR checklist, structured merge/PR decision |
| stress-testing-specs | Devil's advocate for assumptions and scope |
| architecture-review | C4 model, dependency inversion review |
| acceptance-criteria-validation | Binary verdict per criterion, evidence-based |
| codebase-documentation | Divio framework documentation generation |
| skill-authoring | Evidence-driven pattern analysis for new skills |
| agent-authoring | Standardized agent template (identity-only) |
| receiving-code-review | Technical rigor when processing review feedback |
| verification-before-completion | Evidence before claims, always |

## Work Hierarchy

```
Project (one per repo)
  Milestone (M01, M02, ...)
    Slice (M01-S01, M01-S02, ...)
      Task (T01, T02, ...)
```

### Git Branch Model

Branches use UUID-based names for uniqueness and merge safety. Human-readable labels (`M01`, `M01-S01`) are used for directories and PR titles.

```
main
  milestone/a1b2c3d4      # M01 in PR title
    slice/e5f6g7h8        # M01-S01 in PR title (worktree)
    slice/i9j0k1l2        # M01-S02 in PR title (worktree)
```

### Complexity Tiers

| Tier | Brainstormer | Research | TDD | Fresh Reviewer |
|---|---|---|---|---|
| S (quick fix) | Skip | Skip | Skip | Always |
| SS (feature) | Yes | Optional | Yes | Always |
| SSS (complex) | Yes | Required | Yes | Always |

## Branch Isolation

tff-cc writer commands refuse to run on the repository's **default branch** (usually `main` or `master`) to prevent accidental commits to shared branches during slice execution.

### How it works

On every writer command, `tff-tools` compares `git rev-parse --abbrev-ref HEAD` against `git symbolic-ref refs/remotes/origin/HEAD` (fallback: `main`). If they match, the command exits with:

```json
{
  "ok": false,
  "error": {
    "code": "REFUSED_ON_DEFAULT_BRANCH",
    "message": "Refusing to run \"<command>\" on default branch \"<branch>\". Create a worktree before proceeding.",
    "context": { "command": "<command>", "branch": "<branch>" }
  }
}
```

### Remediation

Create a worktree for your slice:

```bash
tff-tools worktree:create --slice-id M01-S01
cd .worktrees/M01-S01
# now run writer commands from here
```

### Exempt commands

Only `project:init` is exempt — it bootstraps the first project on `main` before any feature branch exists.

### Unaffected commands

Read-only and advisory commands (listers, getters, guards, workflows, patterns, skills, classifiers, session reminders, schema) are unaffected.

## Configuration

Project settings live in `.tff-cc/settings.yaml`. Generated automatically by `/tff:new` with inline comments. Manage interactively with `/tff:settings`.

```yaml
model-profiles:
  quality:
    model: opus       # brainstormer, architect, code-reviewer, security-auditor
  balanced:
    model: sonnet     # product-lead, tester
  budget:
    model: sonnet     # frontend-dev, backend-dev, devops, fixer, doc-writer

autonomy:
  mode: guided        # "guided" (pause at every step) | "plan-to-pr" (auto-transition)

auto-learn:
  weights:
    frequency: 0.25
    breadth: 0.30
    recency: 0.25
    consistency: 0.20
  guardrails:
    min-corrections: 3
    cooldown-days: 7
    max-drift-pct: 20
  clustering:
    min-sessions: 3
    min-patterns: 2

```

Settings are resilient: corrupted or partial files fall back to defaults per field. Run `/tff:settings` to detect and add missing fields.

## Routing

tff-cc classifies every routing decision through a layered pipeline (signals → tier → confidence) that was built in phases.

### Phase D — feedback loop (advisory calibration)

Phase D closes the routing loop by measuring outcomes and recommending threshold adjustments.

- `tff-tools routing:event --kind debug --slice <id>` — emit a `/tff:debug` observability event (invoked automatically from `/tff:debug`).
- `tff-tools routing:outcome --decision <uuid> --dimension {agent|tier|unknown} --verdict {ok|wrong|too-low|too-high} [--reason "..."]` — hand-label a past decision.
- `tff-tools routing:calibrate [--n-min 5] [--implicit-weight 0.5]` — generate an advisory markdown report at `.tff-cc/logs/routing-calibration.md` with per-agent and per-tag accuracy cells and rule-based recommendations.

Phase D is read-only over `settings.yaml` — it never auto-applies. Rules fire only on cells with `effective_total ≥ n_min` (default 5). Auto-apply is Phase E.

## Releasing (maintainers)

The `release` branch is a built-artifact channel. The intended flow after a PR merges to `main`:

1. PR merges to `main`.
2. release-please opens a version-bump PR; a maintainer merges it.
3. `.github/workflows/release.yml` runs: publishes to npm, then executes `scripts/sync-release-branch.sh` which force-pushes a fresh snapshot (plugin manifest + resolved content dirs + built `dist/` + native SQLite binaries + top-level docs) to `release`.
4. `.github/workflows/release-branch-validation.yml` fires on the push to `release` (and daily at 05:00 UTC), asserting `dist/cli/index.js` exists, the CLI runs, and no legacy `.tff/` directory has leaked in.
5. If validation is green, the new version is live for `claude /plugin install tff-cc@the-forge-flow`.

Before trusting the sync script in production, maintainers should smoke-test it against a throwaway fork — see the comment block at the top of `scripts/sync-release-branch.sh`.

## License

MIT
