<p align="center">
  <img src="assets/forge-banner.png" alt="The Forge Flow" width="800" />
</p>

<h1 align="center">The Forge Flow</h1>

<p align="center">
  Autonomous coding agent orchestrator for Claude Code.<br/>
  Dual markdown+beads state. Plannotator reviews. Wave-based parallel execution.
</p>

<p align="center">
  <a href="#installation">Install</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#commands">Commands</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#agents">Agents</a>
</p>

---

## What is The Forge Flow?

The Forge Flow (`tff`) is a Claude Code plugin that orchestrates AI agents through a structured software development lifecycle. It coordinates 10 specialized agents from project initialization to shipped code.

**Key features:**
- **Dual state** -- markdown files for human-readable content, beads for status/dependencies
- **Wave-based execution** -- tasks are topologically sorted into waves, independent tasks run in parallel
- **Fresh reviewer enforcement** -- code reviewers are never the same agent that wrote the code
- **Plannotator integration** -- all plan reviews, verification, and code reviews go through plannotator's interactive UI
- **Complexity tiers** -- S (quick fix), F-lite (feature), F-full (complex) determine which phases are required
- **Checkpoint/resumability** -- pause and resume execution across sessions

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- [beads](https://github.com/beads-org/beads) CLI: `npm install -g @beads/bd`
- [plannotator](https://github.com/backnotprop/plannotator) CC plugin
- Node.js >= 20

## Installation

```bash
# Add the marketplace
claude /plugin marketplace add MonsieurBarti/The-Forge-Flow-CC

# Install the plugin
claude /plugin install the-forge-flow@the-forge-flow
```

The plugin ships pre-built -- no build step required.

## Quick Start

```bash
# Initialize a new project
/tff:new

# Start discussing the first slice
/tff:discuss

# Plan it (opens plannotator for review)
/tff:plan

# Execute with wave parallelism
/tff:execute

# Verify acceptance criteria
/tff:verify

# Ship it (PR + code review + security audit)
/tff:ship
```

## Commands

### Project Lifecycle

| Command | Description |
|---|---|
| `/tff:new` | Initialize a new tff project |
| `/tff:new-milestone` | Start a new milestone |
| `/tff:progress` | Show status dashboard |

### Slice Lifecycle

| Command | Description |
|---|---|
| `/tff:discuss` | Brainstorm and scope a slice |
| `/tff:research [slice-id]` | Research phase |
| `/tff:plan [slice-id]` | Plan and create tasks |
| `/tff:execute [slice-id]` | Execute with wave parallelism |
| `/tff:verify [slice-id]` | Verify acceptance criteria |
| `/tff:ship [slice-id]` | PR review and merge slice |

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
| `/tff:sync` | Sync markdown and beads |
| `/tff:health` | Diagnose state consistency |
| `/tff:settings` | Configure model profiles |
| `/tff:help` | Show command reference |

## Architecture

```
the-forge-flow/
  .claude-plugin/         # CC marketplace manifest
  commands/tff/           # 21 slash commands (.md)
  agents/                 # 10 agent definitions (.md)
  workflows/              # 15 orchestration workflows (.md)
  references/             # Conventions, model profiles (.md)
  hooks/                  # SessionStart + PostToolUse hooks (.js)
  tools/
    src/
      domain/             # Hexagonal domain layer (Zod, Result<T,E>)
      application/        # Use cases (orchestrate domain via ports)
      infrastructure/     # Adapters (beads CLI, git CLI, filesystem)
      cli/                # tff-tools.cjs entry point
    dist/tff-tools.cjs    # Compiled single-file CLI bundle
```

### Hexagonal Rules

- **Domain** imports only Zod + `node:crypto`. No infrastructure.
- **Zod as single source of truth** -- `z.infer<typeof Schema>` everywhere, no TS `enum`.
- **Result\<T, E\>** for all fallible operations. Never throw.
- **Ports** define interfaces in domain. Adapters implement in infrastructure.
- **Tests** colocated as `.spec.ts`. Unit tests use in-memory adapters.

## Agents

| Agent | Role | Profile |
|---|---|---|
| brainstormer | Challenge assumptions, surface unknowns | quality (opus) |
| architect | Architecture decisions, module boundaries | quality (opus) |
| product-lead | Requirements validation, acceptance criteria | balanced (sonnet) |
| backend-dev | API, services, domain logic | budget (sonnet) |
| frontend-dev | UI code, components | budget (sonnet) |
| devops | CI/CD, infrastructure | budget (sonnet) |
| tester | Write failing tests before implementation | balanced (sonnet) |
| code-reviewer | Code quality review (fresh reviewer) | quality (opus) |
| security-auditor | Security review on every PR | quality (opus) |
| fixer | Apply accepted review findings | budget (sonnet) |

## Work Hierarchy

```
Project (one per repo)
  Milestone (M01, M02, ...)
    Slice (M01-S01, M01-S02, ...)
      Task (T01, T02, ...)
```

### Git Branch Model

```
main
  milestone/M01
    slice/M01-S01  (worktree)
    slice/M01-S02  (worktree)
```

### Complexity Tiers

| Tier | Brainstormer | Research | TDD | Fresh Reviewer |
|---|---|---|---|---|
| S (quick fix) | Skip | Skip | Skip | Always |
| F-lite (feature) | Yes | Optional | Yes | Always |
| F-full (complex) | Yes | Required | Yes | Always |

## Configuration

Project settings live in `.tff/settings.yaml`:

```yaml
model-profiles:
  quality:
    model: opus
  balanced:
    model: sonnet
  budget:
    model: sonnet
```

## License

MIT
