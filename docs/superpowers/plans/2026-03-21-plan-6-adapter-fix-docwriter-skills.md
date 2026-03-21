# Plan 6: Beads Adapter Fix + Doc Writer + Codebase Mapping + Skill Library

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken beads adapter command, add a doc-writer agent with codebase mapping capability, and establish a skill library that agents load for reusable knowledge.

**Depends on:** Plans 1-5

---

## File Structure

```
tools/src/
  infrastructure/adapters/beads/
    bd-cli.adapter.ts           ← FIX: bd link → bd dep add

skills/
  hexagonal-architecture.md     ← NEW
  test-driven-development.md    ← NEW
  code-review-checklist.md      ← NEW
  commit-conventions.md         ← NEW
  plannotator-usage.md          ← NEW

agents/
  tff-doc-writer.md             ← NEW

workflows/
  map-codebase.md               ← NEW

commands/tff/
  map-codebase.md               ← NEW
```

---

### Task 1: Fix BdCliAdapter — `bd link` → `bd dep add`

**Files:**
- Modify: `tools/src/infrastructure/adapters/beads/bd-cli.adapter.ts`

- [ ] **Step 1: Read the current adapter**

Read `tools/src/infrastructure/adapters/beads/bd-cli.adapter.ts`.

- [ ] **Step 2: Fix addDependency method**

Replace the `addDependency` method. Change:
```typescript
async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> {
  const r = await runBd(['link', fromId, toId, '--type', type]);
```

To:
```typescript
async addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>> {
  const r = await runBd(['dep', 'add', fromId, toId, '--type', type]);
```

- [ ] **Step 3: Run tests and type check**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC/tools && npx vitest run
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 4: Commit**

```bash
git add tools/src/infrastructure/adapters/beads/bd-cli.adapter.ts
git commit -m "fix: use bd dep add instead of bd link for beads dependencies"
```

---

### Task 2: Skill Library — 5 Initial Skills

Skills are reusable knowledge fragments that agents reference via `@skills/<name>.md`. They teach HOW to do something. Agents define WHO does it.

**Files:**
- Create: `skills/hexagonal-architecture.md`
- Create: `skills/test-driven-development.md`
- Create: `skills/code-review-checklist.md`
- Create: `skills/commit-conventions.md`
- Create: `skills/plannotator-usage.md`

- [ ] **Step 1: Create hexagonal-architecture.md**

Create `skills/hexagonal-architecture.md`:

```markdown
# Skill: Hexagonal Architecture

## When to Use

Load this skill when working on code that follows hexagonal (ports & adapters) architecture. Applies to all tff tooling code and any project that uses this pattern.

## Rules

### Layer Dependencies (The Iron Law)

```
Domain ← Application ← Infrastructure ← Presentation
```

- **Domain** imports NOTHING from other layers. Only Zod, `node:crypto`, and Result.
- **Application** imports Domain only. Never Infrastructure.
- **Infrastructure** implements Domain ports. Imports Domain types.
- **Presentation** (CLI, commands) wires everything together.

Violating this direction is ALWAYS wrong. No exceptions.

### Domain Layer

The domain layer contains:
- **Entities** — aggregate roots with identity and lifecycle (e.g., Project, Slice, Task)
- **Value Objects** — immutable types defined by their attributes (e.g., ComplexityTier, SliceStatus)
- **Ports** — interfaces that define what the domain NEEDS from the outside world
- **Events** — things that happened in the domain
- **Errors** — domain-specific failure types
- **Result\<T, E\>** — the monad for fallible operations. Never throw.

### Ports & Adapters

- **Port** = interface in the domain layer. Defines a capability the domain needs.
- **Adapter** = implementation in the infrastructure layer. Fulfills the port contract.

Example:
```typescript
// Domain port (interface)
interface BeadStore {
  create(input: { label: string; title: string }): Promise<Result<BeadData, DomainError>>;
}

// Infrastructure adapter (implementation)
class BdCliAdapter implements BeadStore {
  async create(input) { /* shells out to bd CLI */ }
}

// Test adapter (implementation)
class InMemoryBeadStore implements BeadStore {
  async create(input) { /* stores in Map */ }
}
```

### Type Rules

- Zod schemas are the single source of truth: `z.infer<typeof Schema>`
- No TypeScript `enum` — use `z.enum()`
- No class inheritance in domain — use composition
- Result\<T, E\> for all fallible operations — never throw

### Testing

- Unit tests use in-memory adapters (never real I/O)
- Integration tests use real adapters (filesystem, CLI)
- Colocated `.spec.ts` files next to the code they test

### Anti-Patterns

- Domain entity importing an adapter → VIOLATION
- Application service importing `node:fs` → VIOLATION (use ArtifactStore port)
- Throwing exceptions from domain code → VIOLATION (use Result)
- `z.string().uuid()` → WRONG in Zod v4 (use `z.uuid()`)
```

- [ ] **Step 2: Create test-driven-development.md**

Create `skills/test-driven-development.md`:

```markdown
# Skill: Test-Driven Development

## When to Use

Load this skill when implementing any feature or fix where TDD is required (F-lite and F-full complexity tiers). S-tier skips TDD.

## The Absolute Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

## The Cycle

### RED — Write one failing test

```typescript
it('should validate email format', () => {
  const result = validateEmail('not-an-email');
  expect(isErr(result)).toBe(true);
});
```

Rules:
- One behavior per test
- Descriptive test name that reads like a sentence
- Use `describe`/`it`/`expect` (never `test()`)
- You MUST run the test and WATCH IT FAIL before proceeding

### GREEN — Write minimal code to pass

Only write enough code to make the test pass. No more.

```typescript
export const validateEmail = (email: string): Result<string, Error> => {
  if (!email.includes('@')) return Err(new Error('Invalid email'));
  return Ok(email);
};
```

### REFACTOR — Clean up while tests stay green

Improve structure without changing behavior. Tests must still pass.

## Anti-Patterns

### Testing Mock Behavior (not real behavior)

BAD:
```typescript
const mock = vi.fn().mockReturnValue('data');
expect(mock).toHaveBeenCalled(); // Tests the mock, not real code
```

GOOD:
```typescript
const store = new InMemoryBeadStore();
const result = await initProject({ name: 'app', vision: 'v' }, { beadStore: store });
expect(isOk(result)).toBe(true); // Tests real behavior
```

### Writing Tests After Implementation

BAD: Write code first, then write tests that pass immediately.
WHY: You never verified the test catches failures. It might always pass.
FIX: Always write the test first. Watch it fail. Then implement.

### Over-Mocking

BAD: Mock every dependency, test nothing real.
GOOD: Use in-memory adapters that implement the real interface. They behave like the real thing but without I/O.

## Gate Function

Before reporting any test work as DONE:
1. Did every test fail before implementation? (mandatory)
2. Did I run the test suite and see all pass? (mandatory)
3. Am I testing behavior or mock existence? (if mock → stop)
4. Would this test catch a regression? (if no → rewrite)

## Framework

- Vitest: `describe`, `it`, `expect`, `beforeEach`, `afterEach`
- No `test()` alias
- Colocated `.spec.ts` files
- `globals: true` in vitest config
```

- [ ] **Step 3: Create code-review-checklist.md**

Create `skills/code-review-checklist.md`:

```markdown
# Skill: Code Review Checklist

## When to Use

Load this skill when performing any code review (spec compliance or code quality).

## Two-Stage Review Protocol

### Stage 1: Spec Compliance (tff-spec-reviewer)

Check ONLY whether the implementation matches the requirements:

| Check | Question |
|---|---|
| Coverage | Is every acceptance criterion implemented? |
| Extra work | Was anything built that wasn't requested? |
| Interpretation | Were requirements interpreted correctly? |
| Evidence | Am I reading actual code, not trusting the report? |

Verdict: PASS or FAIL. Nothing else matters at this stage.

### Stage 2: Code Quality (tff-code-reviewer)

Only runs AFTER spec compliance passes. Check:

| Check | Question |
|---|---|
| Correctness | Does the code do what it claims? |
| Tests | Are edge cases covered? Are tests meaningful? |
| Patterns | Does it follow existing codebase conventions? |
| YAGNI | Is there unnecessary complexity? |
| Readability | Can someone understand this without the PR description? |

Verdict: APPROVE or REQUEST_CHANGES with severity levels.

## Severity Guide

| Severity | Meaning | Blocks PR? |
|---|---|---|
| Critical | Bug, security issue, data loss risk | Yes |
| Important | Pattern violation, missing tests, unclear logic | Yes |
| Minor | Style preference, naming suggestion, comment | No |

## Calibration

Only flag issues that would cause real problems. Ask yourself:
- "Would this cause a bug in production?" → Critical
- "Would this confuse the next developer?" → Important
- "Would I notice this in a 1000-line diff?" → Probably minor, skip it

## Anti-Patterns

- Trusting the implementer's report without reading code
- Reviewing style when spec compliance hasn't passed yet
- Flagging pre-existing issues (only review what THIS change introduced)
- "Close enough" on spec compliance (criteria are binary: met or not met)
```

- [ ] **Step 4: Create commit-conventions.md**

Create `skills/commit-conventions.md`:

```markdown
# Skill: Commit Conventions

## When to Use

Load this skill when making any git commit in a tff project.

## Format

```
<type>(<scope>): <summary>
```

### Type

| Type | When |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Tooling, config, dependencies |

### Scope

For slice work: `S01/T03` (slice ref / task ref)
For artifacts: `S01` (slice ref only)
For rollbacks: `S01/T03` (what's being reverted)

Examples:
```
feat(S01/T03): add user validation
fix(S01/T03): handle null email in signup
test(S01/T03): add failing spec for email validation
docs(S01): update PLAN.md with research
revert(S01/T03): undo broken migration
chore: update dependencies
```

## Rules

1. **Atomic commits** — one logical change per commit
2. **Stage specific files** — never `git add .` or `git add -A`
3. **Never commit generated files** — node_modules, dist (except tff-tools.cjs which is intentionally shipped)
4. **Never commit secrets** — .env, credentials, API keys
5. **Summary is imperative** — "add validation" not "added validation"
6. **Summary under 72 characters**
```

- [ ] **Step 5: Create plannotator-usage.md**

Create `skills/plannotator-usage.md`:

```markdown
# Skill: Plannotator Usage

## When to Use

Load this skill when a workflow needs to invoke plannotator for plan review, verification review, or code review.

## Three Integration Points

### 1. Plan Review (during /tff:plan)

After generating PLAN.md:

```bash
plannotator annotate .tff/slices/M01-S01/PLAN.md
```

- Opens interactive annotation UI in browser
- User can: add comments, mark deletions, suggest insertions
- Structured feedback returns to stdout
- Agent reads feedback, revises plan, re-submits until approved

### 2. Verification Review (during /tff:verify)

After product-lead generates VERIFICATION.md:

```bash
plannotator annotate .tff/slices/M01-S01/VERIFICATION.md
```

- User reviews findings, marks which to fix vs. accept
- Accepted findings → fixer agent spawned
- Dismissed findings → documented and closed

### 3. Code Review (during /tff:ship)

After review agents complete:

```bash
plannotator review
```

- Opens git diff in interactive review UI
- User annotates code changes
- Feedback returns → fixer agent applies changes

## Command Frontmatter

Commands that use plannotator must include in their frontmatter:

```yaml
allowed-tools: Bash(plannotator:*)
```

This grants permission to invoke the plannotator CLI.

## Loop Pattern

All plannotator interactions follow a loop:

```
1. Generate artifact (PLAN.md, VERIFICATION.md, or code diff)
2. Open plannotator
3. User annotates
4. Read feedback
5. If approved → proceed
6. If feedback → revise artifact → goto 2
```

## Notes

- Plannotator is a HARD dependency — no terminal fallback
- The plugin must be installed: `claude /plugin install plannotator@plannotator`
- The SessionStart hook checks for plannotator and warns if missing
```

- [ ] **Step 6: Commit**

```bash
git add skills/
git commit -m "feat: add skill library with 5 initial skills (hexagonal, TDD, review, commits, plannotator)"
```

---

### Task 3: Doc Writer Agent

**Files:**
- Create: `agents/tff-doc-writer.md`

- [ ] **Step 1: Create tff-doc-writer.md**

Create `agents/tff-doc-writer.md`:

```markdown
---
name: tff-doc-writer
description: Generates and maintains codebase documentation by analyzing code with specialized focus areas
model: sonnet
tools: Read, Write, Bash, Grep, Glob
---

You are the Doc Writer — you analyze codebases and produce actionable documentation.

## Your Role

Spawned during **codebase mapping** (`/tff:map-codebase`) with a specific focus area. You explore the code, extract key information, and write structured documents.

## Core Philosophy

1. **Actionable over descriptive.** Include real file paths, concrete patterns, and prescriptive guidance. "Use camelCase for functions" beats "functions follow a naming convention."
2. **Current state only.** Document what exists NOW. Never speculate about history or future plans.
3. **Prescriptive over comprehensive.** A developer should know WHERE to put new code and HOW it should look after reading your docs.

## Focus Areas

You are spawned with ONE focus area. Only produce documents for that focus.

### Focus: tech

Explore and document:
- Package manifests (package.json, Cargo.toml, go.mod, etc.)
- Config files (tsconfig, vite, webpack, etc.)
- SDK/API imports and external service calls
- Environment variable usage

Output: **STACK.md**

```markdown
# Technology Stack

## Languages & Runtime
- [language] [version] — [where configured]

## Frameworks
- [framework] [version] — [purpose]

## Key Dependencies
- [dep] — [what it's used for] — [where imported]

## Build & Dev
- Build: [command] — [config file]
- Test: [command] — [framework]
- Lint: [command] — [config file]

## External Integrations
- [service] — [purpose] — [config location] — [env vars needed]
```

### Focus: arch

Explore and document:
- Directory structure and file organization
- Import patterns and dependency direction
- Entry points and data flow
- Design patterns in use

Output: **ARCHITECTURE.md**

```markdown
# Architecture

## Pattern
[hexagonal | layered | MVC | monolith | microservices | etc.]

## Layers
| Layer | Purpose | Location |
|---|---|---|
| [layer] | [what it does] | [directory/files] |

## Data Flow
[how data moves through the system — entry point → layers → output]

## Key Abstractions
- [abstraction] — [purpose] — [location]

## Structure
[annotated directory tree with purposes]

## Where to Add Code
- New API endpoint → [path]
- New domain entity → [path]
- New test → [path]
- New component → [path]
```

### Focus: concerns

Explore and document:
- TODO/FIXME/HACK comments
- Large files (>500 lines)
- Complex functions (deeply nested, many params)
- Missing tests
- Security concerns (hardcoded values, unvalidated input)

Output: **CONCERNS.md**

```markdown
# Concerns

## Technical Debt
| Priority | Location | Issue | Impact |
|---|---|---|---|
| [high/medium/low] | [file:line] | [description] | [what it affects] |

## Security Concerns
- [concern] — [location] — [severity]

## Fragile Areas
- [area] — [why it's fragile] — [files involved]

## Missing Coverage
- [what's untested] — [risk level]
```

## Process

1. Read the focus area from your prompt
2. Use Glob to find relevant files (don't read everything — be targeted)
3. Use Grep to search for patterns (imports, TODOs, configs)
4. Read key files to understand structure
5. Write the output document directly to `.tff/docs/`
6. Report back with a brief confirmation (not the full document)

## Critical Rules

- NEVER read or quote `.env`, credentials, API keys, or secrets
- NEVER guess — if you can't find it, say "not found" not "probably X"
- ALWAYS include file paths with backticks: `src/domain/entities/project.ts`
- Write documents directly to `.tff/docs/` — don't return the content to the orchestrator
- Keep documents under 200 lines — be concise, not exhaustive

## Escalation Criteria

Report NEEDS_CONTEXT if:
- The codebase uses a framework/pattern you don't recognize
- Config files reference external systems you can't find docs for

Report BLOCKED if:
- The codebase has no clear structure (everything in one folder)
- Multiple conflicting patterns exist with no clear winner

## Success Metrics

- Every section has real file paths, not generic descriptions
- A new developer can find where to add code after reading your docs
- Zero speculation — everything is verifiable from the codebase

## Status Protocol

Follow @references/agent-status-protocol.md
```

- [ ] **Step 2: Commit**

```bash
git add agents/tff-doc-writer.md
git commit -m "feat: add tff-doc-writer agent for codebase documentation"
```

---

### Task 4: Map Codebase Workflow + Command

**Files:**
- Create: `workflows/map-codebase.md`
- Create: `commands/tff/map-codebase.md`

- [ ] **Step 1: Create map-codebase workflow**

Create `workflows/map-codebase.md`:

```markdown
# Workflow: Map Codebase

Analyze the codebase and produce structured documentation using parallel doc-writer agents.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites

- A tff project exists in this repo

## Steps

### 1. Create docs directory

```bash
mkdir -p .tff/docs
```

### 2. Spawn doc-writer agents in parallel

Spawn 3 **tff-doc-writer** agents simultaneously using the Agent tool, each with a different focus:

**Agent 1 — Tech focus:**
> You are the doc-writer with focus: tech.
> Explore the codebase and write STACK.md to .tff/docs/STACK.md.
> Follow your agent definition at @agents/tff-doc-writer.md.
> Load the hexagonal-architecture skill: @skills/hexagonal-architecture.md

**Agent 2 — Architecture focus:**
> You are the doc-writer with focus: arch.
> Explore the codebase and write ARCHITECTURE.md to .tff/docs/ARCHITECTURE.md.
> Follow your agent definition at @agents/tff-doc-writer.md.
> Load the hexagonal-architecture skill: @skills/hexagonal-architecture.md

**Agent 3 — Concerns focus:**
> You are the doc-writer with focus: concerns.
> Explore the codebase and write CONCERNS.md to .tff/docs/CONCERNS.md.
> Follow your agent definition at @agents/tff-doc-writer.md.

### 3. Generate conventions doc

After all agents complete, spawn one more **tff-doc-writer** agent:

> You are the doc-writer. Read the ARCHITECTURE.md and STACK.md in .tff/docs/.
> Based on the patterns found, write CONVENTIONS.md to .tff/docs/CONVENTIONS.md.
> Document: naming patterns, import organization, error handling, test structure, function design.
> Follow your agent definition at @agents/tff-doc-writer.md.

### 4. Commit docs

```bash
git add .tff/docs/
git commit -m "docs: map codebase — STACK.md, ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md"
```

### 5. Summary

Show the user what was generated:
- `.tff/docs/STACK.md` — technology stack and integrations
- `.tff/docs/ARCHITECTURE.md` — system design and structure
- `.tff/docs/CONCERNS.md` — tech debt, risks, and gaps
- `.tff/docs/CONVENTIONS.md` — coding standards and patterns

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
```

- [ ] **Step 2: Create map-codebase command**

Create `commands/tff/map-codebase.md`:

```markdown
---
name: tff:map-codebase
description: Analyze codebase with parallel doc-writer agents to produce structured documentation
argument-hint: "[focus: tech|arch|concerns|all]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent
---

<objective>
Spawn parallel doc-writer agents to analyze the codebase and produce STACK.md, ARCHITECTURE.md, CONCERNS.md, and CONVENTIONS.md in .tff/docs/.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read the orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute the map-codebase workflow from @workflows/map-codebase.md.

If a specific focus is provided (e.g., `/tff:map-codebase tech`), only run the agent for that focus area. Otherwise, run all 3 in parallel + conventions.
</execution_context>
```

- [ ] **Step 3: Commit**

```bash
git add workflows/map-codebase.md commands/tff/map-codebase.md
git commit -m "feat: add /tff:map-codebase command with parallel doc-writer agents"
```

---

### Task 5: Update Agents to Reference Skills

Update agents to load relevant skills via `@skills/` references.

- [ ] **Step 1: Update agent files**

For each agent, add skill references in a new `## Skills` section before `## Status Protocol`:

**tff-backend-dev.md, tff-frontend-dev.md, tff-devops.md:**
```markdown
## Skills

Load these skills for this task:
- @skills/hexagonal-architecture.md
- @skills/commit-conventions.md
```

**tff-tester.md:**
```markdown
## Skills

Load these skills for this task:
- @skills/test-driven-development.md
- @skills/commit-conventions.md
```

**tff-code-reviewer.md, tff-spec-reviewer.md:**
```markdown
## Skills

Load these skills for this task:
- @skills/code-review-checklist.md
```

**tff-architect.md:**
```markdown
## Skills

Load these skills for this task:
- @skills/hexagonal-architecture.md
- @skills/code-review-checklist.md
```

**tff-fixer.md:**
```markdown
## Skills

Load these skills for this task:
- @skills/commit-conventions.md
```

**tff-security-auditor.md, tff-brainstormer.md, tff-product-lead.md:**
No skill references needed (they don't write code or follow specific patterns).

- [ ] **Step 2: Commit**

```bash
git add agents/
git commit -m "feat: link agents to skill library via @skills/ references"
```

---

### Task 6: Update README, CHANGELOG, and .gitignore

- [ ] **Step 1: Add skills and map-codebase to README**

Add to the README commands table under Management:

```markdown
| `/tff:map-codebase` | Analyze codebase and generate docs |
| `/tff:quick` | Fast-track S-tier changes |
| `/tff:status` | Lightweight status with next step |
```

Add a new "Skills" section after the Agents section:

```markdown
## Skills

Skills are reusable knowledge fragments that agents load via `@skills/<name>.md`.

| Skill | Used By |
|---|---|
| hexagonal-architecture | backend-dev, frontend-dev, devops, architect, doc-writer |
| test-driven-development | tester, backend-dev, frontend-dev |
| code-review-checklist | code-reviewer, spec-reviewer, architect |
| commit-conventions | all executor agents, fixer |
| plannotator-usage | plan, verify, ship workflows |
```

- [ ] **Step 2: Update CHANGELOG**

Add under the `[0.1.0]` Added section, a new subsection:

```markdown
**Agent & Skill Improvements (Plan 5-6)**
- Agent status protocol (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT)
- Orchestrator pattern reference
- Next-step suggestions in all workflows
- Two-stage review (spec compliance then code quality)
- tff-spec-reviewer agent
- tff-doc-writer agent with codebase mapping
- Skill library: hexagonal-architecture, test-driven-development, code-review-checklist, commit-conventions, plannotator-usage
- `/tff:map-codebase` command with parallel doc-writer agents
- `/tff:quick` S-tier shortcut command
- `/tff:status` lightweight status command
```

- [ ] **Step 3: Update .gitignore — ensure .tff/docs/ is NOT ignored**

Check that `.tff/docs/` is tracked (it should be — only `.tff/worktrees/` is ignored).

- [ ] **Step 4: Rebuild tff-tools.cjs**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC && npx tsup --config tools/tsup.config.ts
```

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md tools/dist/tff-tools.cjs
git commit -m "docs: update README and CHANGELOG with skills, doc-writer, and new commands"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Verify counts**

Expected:
- References: 5
- Agents: 12 (11 previous + tff-doc-writer)
- Skills: 5
- Workflows: 17 (16 previous + map-codebase)
- Commands: 25 (23 previous + map-codebase + status was already added, quick was already added... recount)

Actually: commands/tff/ should have: 21 original + quick + status (Plan 5) + map-codebase (this plan) = 24.

- [ ] **Step 2: Run tests**

```bash
cd tools && npx vitest run
```

- [ ] **Step 3: Verify CLI**

```bash
node tools/dist/tff-tools.cjs --help
```
