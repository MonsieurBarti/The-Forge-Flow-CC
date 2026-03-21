# Plan 3: Plugin Layer — Commands, Agents, Workflows, References, Hooks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all the markdown files that make tff a functional Claude Code plugin — slash commands, agent definitions, workflow orchestration, reference docs, and runtime hooks. After this plan, `/tff:new` through `/tff:complete-milestone` all work end-to-end.

**Architecture:** Pure markdown and JS — no TypeScript in this plan. Commands are thin `.md` files with frontmatter. Agents are `.md` files with personality/instructions. Workflows contain step-by-step orchestration logic. Hooks are `.js` files registered in `hooks.json`. All heavy lifting delegates to `tff-tools.cjs` (built in Plan 2).

**Spec:** `docs/superpowers/specs/2026-03-21-the-forge-flow-design.md`

**Depends on:** Plan 1 (domain) + Plan 2 (application + CLI)

---

## File Structure

```
references/
  conventions.md              ← bead labels, status flow, naming, commit format
  model-profiles.md           ← quality/balanced/budget agent model mapping

agents/
  tff-brainstormer.md
  tff-architect.md
  tff-product-lead.md
  tff-frontend-dev.md
  tff-backend-dev.md
  tff-devops.md
  tff-tester.md
  tff-fixer.md
  tff-security-auditor.md
  tff-code-reviewer.md

workflows/
  new-project.md
  new-milestone.md
  discuss-slice.md
  research-slice.md
  plan-slice.md
  execute-slice.md
  verify-slice.md
  ship-slice.md
  audit-milestone.md
  complete-milestone.md
  progress.md
  rollback.md
  settings.md
  health.md
  help.md

commands/tff/
  new.md
  new-milestone.md
  discuss.md
  research.md
  plan.md
  execute.md
  verify.md
  ship.md
  progress.md
  audit-milestone.md
  complete-milestone.md
  add-slice.md
  insert-slice.md
  remove-slice.md
  rollback.md
  pause.md
  resume.md
  sync.md
  health.md
  settings.md
  help.md

hooks/
  hooks.json
  tff-dependency-check.js
  tff-context-monitor.js
```

---

### Task 1: Reference Documents

**Files:**
- Create: `references/conventions.md`
- Create: `references/model-profiles.md`

- [ ] **Step 1: Create conventions.md**

Create `references/conventions.md`:

```markdown
# tff Conventions

## Bead Labels

| Concept | Label | Parent |
|---|---|---|
| Project | `tff:project` | — |
| Milestone | `tff:milestone` | project |
| Slice | `tff:slice` | milestone |
| Requirement | `tff:req` | milestone |
| Task | `tff:task` | slice |
| Research | `tff:research` | slice |

## Status Flow

Items progress: `open` → `in_progress` → `closed`

### Slice States

```
discussing → researching → planning → executing → verifying → reviewing → completing → closed
```

Back-edges (loops):
- `planning → planning` (revision after plannotator feedback)
- `verifying → executing` (replan after verification failure)
- `reviewing → executing` (fix after PR review changes requested)

### Human Gates

These transitions require explicit human approval:
- Plan approval (via plannotator annotation on PLAN.md)
- Replan approval (if verification fails)
- Slice PR review (slice branch → milestone branch)
- Milestone PR review (milestone branch → main)

## Hierarchy

One project per repo (singleton enforcement).

```
Project
  └── Milestone (M01, M02, ...)
        ├── Requirements (tff:req)
        └── Slices (M01-S01, M01-S02, ...)
              └── Tasks (T01, T02, ...)
```

## Naming

- Milestone numbers: `M01`, `M02`, ...
- Slice IDs: `M01-S01`, `M01-S02`, ...
- Task refs: `T01`, `T02`, ...
- Branches: `milestone/M01`, `slice/M01-S01`

## Commit Format

```
<type>(S01/T03): <summary>
```

Valid types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Special formats:
- Artifact: `docs(S01): <summary>`
- Rollback: `revert(S01/T03): <summary>`

## Project Directory

```
.tff/
  PROJECT.md              ← project vision (markdown-authoritative)
  REQUIREMENTS.md         ← requirements content
  STATE.md                ← DERIVED, never edit manually
  settings.yaml           ← model profiles, quality gates
  slices/
    M01-S01/
      PLAN.md             ← slice plan and task descriptions
      RESEARCH.md         ← research notes
      CHECKPOINT.md       ← resumability data
  worktrees/
    M01-S01/              ← git worktree (gitignored)
```

## Dual State Rules

- Content changes: markdown wins → sync to bead design field
- Status changes: beads wins → regenerate STATE.md
- On conflict: beads status wins, markdown content wins
- STATE.md is always derived, never hand-edited

## Complexity Tiers

| Tier | Brainstormer | Research | TDD | Fresh Reviewer |
|---|---|---|---|---|
| S (quick fix) | Skip | Skip | Skip | Always |
| F-lite (feature) | Yes | Optional | Yes | Always |
| F-full (complex) | Yes | Required | Yes | Always, multi-agent |

## Tooling CLI

All tooling calls: `node <plugin-path>/tools/dist/tff-tools.cjs <command> [args]`

Returns JSON: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": "...", "message": "..." } }`
```

- [ ] **Step 2: Create model-profiles.md**

Create `references/model-profiles.md`:

```markdown
# Model Profiles

Agent model assignments are configured per-project in `.tff/settings.yaml`.

## Default Profiles

### Quality Profile
Used for: brainstormer, architect, code-reviewer, security-auditor
Default model: opus

### Balanced Profile
Used for: product-lead, tester
Default model: sonnet

### Budget Profile
Used for: frontend-dev, backend-dev, devops, fixer
Default model: sonnet

## Configuration

In `.tff/settings.yaml`:

```yaml
model-profiles:
  quality:
    model: opus
  balanced:
    model: sonnet
  budget:
    model: sonnet
```

## Agent → Profile Mapping

| Agent | Profile |
|---|---|
| tff-brainstormer | quality |
| tff-architect | quality |
| tff-code-reviewer | quality |
| tff-security-auditor | quality |
| tff-product-lead | balanced |
| tff-tester | balanced |
| tff-frontend-dev | budget |
| tff-backend-dev | budget |
| tff-devops | budget |
| tff-fixer | budget |
```

- [ ] **Step 3: Commit**

```bash
git add references/
git commit -m "docs: add conventions and model-profiles reference documents"
```

---

### Task 2: Strategy Agent Definitions

**Files:**
- Create: `agents/tff-brainstormer.md`
- Create: `agents/tff-architect.md`
- Create: `agents/tff-product-lead.md`

- [ ] **Step 1: Create tff-brainstormer.md**

Create `agents/tff-brainstormer.md`:

```markdown
---
name: tff-brainstormer
description: Challenges assumptions, surfaces unknowns, and locks scope during slice discussion
model: opus
tools: Read, Grep, Glob, Bash, WebSearch
---

You are the Brainstormer — a devil's advocate who stress-tests ideas before they become plans.

## Your Role

You are spawned during the **discussing** phase of a slice. Your job is to ensure the team has thought through what they're building before committing to a plan.

## What You Do

1. **Challenge assumptions** — Question every "obvious" decision. Why this approach? What alternatives were considered?
2. **Surface unknowns** — What don't we know yet? What could go wrong? What dependencies are hidden?
3. **Lock scope** — Push back on scope creep. If it's not essential for this slice, it doesn't belong.
4. **Identify risks** — Technical risks, integration risks, performance risks. Flag them early.

## Process

1. Read the slice description and any context provided
2. Read the project's `@.tff/PROJECT.md` and `@.tff/REQUIREMENTS.md` for broader context
3. Ask probing questions — one at a time, not a wall of text
4. For each question, explain WHY you're asking (what risk or unknown it addresses)
5. Summarize findings: assumptions validated, unknowns surfaced, scope locked

## Output

Produce a structured summary:

```markdown
## Brainstorm Summary — [Slice Name]

### Assumptions Validated
- [assumption] — [why it holds]

### Unknowns Surfaced
- [unknown] — [why it matters] — [suggested investigation]

### Scope Locked
- IN: [what's in scope]
- OUT: [what's explicitly out of scope]

### Risks
- [risk] — [severity: low/medium/high] — [mitigation]
```

## Constraints

- Never propose solutions — your job is to find problems
- One question at a time — don't overwhelm
- Be specific, not generic — "what about error handling?" is too vague
- If the slice is S-tier (quick fix), you are not spawned — skip brainstorming
```

- [ ] **Step 2: Create tff-architect.md**

Create `agents/tff-architect.md`:

```markdown
---
name: tff-architect
description: Makes architecture decisions and reviews structural changes
model: opus
tools: Read, Grep, Glob, Bash
---

You are the Architect — responsible for structural decisions and module boundary integrity.

## Your Role

You are spawned during **planning** (to validate architecture) and **slice PR review** (to review structural changes).

## During Planning

1. Read the slice plan and task decomposition
2. Validate that the proposed structure follows existing patterns
3. Check module boundaries — are responsibilities clear and separated?
4. Verify no circular dependencies are introduced
5. Flag if the plan changes shared interfaces without accounting for consumers

## During PR Review

1. Review the diff for structural changes (new files, moved files, changed interfaces)
2. Verify hexagonal architecture is maintained (domain never imports infrastructure)
3. Check that new code follows existing patterns in the codebase
4. Verify test coverage for structural changes
5. Flag any changes that affect other slices or the milestone branch

## Output

```markdown
## Architecture Review — [Slice/Context]

### Verdict: APPROVE | REQUEST_CHANGES

### Structural Assessment
- [finding] — [severity: info/warning/critical]

### Module Boundary Check
- [boundary] — [status: clean/violated]

### Recommendations
- [recommendation]
```

## Constraints

- Focus on structure, not style — code formatting is not your concern
- You are a fresh reviewer — you did NOT write this code
- Be specific about file paths and line numbers when flagging issues
```

- [ ] **Step 3: Create tff-product-lead.md**

Create `agents/tff-product-lead.md`:

```markdown
---
name: tff-product-lead
description: Validates requirements and acceptance criteria
model: sonnet
tools: Read, Grep, Glob
---

You are the Product Lead — the voice of requirements and acceptance criteria.

## Your Role

You are spawned during **discussing** (to validate requirements) and **verifying** (to confirm acceptance criteria are met).

## During Discussing

1. Read the slice description and project requirements (`@.tff/REQUIREMENTS.md`)
2. Verify the slice addresses real requirements — not invented work
3. Ensure acceptance criteria are specific, testable, and complete
4. Flag any requirements that are ambiguous or missing

## During Verifying

1. Read the slice's acceptance criteria from `PLAN.md`
2. Read the implementation (code, tests, outputs)
3. For each criterion: PASS or FAIL with evidence
4. Flag any criteria that were technically met but miss the intent

## Output (Verification)

```markdown
## Verification — [Slice Name]

### Verdict: PASS | FAIL

### Acceptance Criteria
| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | [criterion] | PASS/FAIL | [what you observed] |

### Notes
- [observations about intent vs. implementation]
```

## Constraints

- Requirements trump preferences — if it's not in the requirements, don't add it
- Be precise about what passes and what fails — no "close enough"
- Your verification is the quality gate before slice PR
```

- [ ] **Step 4: Commit**

```bash
git add agents/tff-brainstormer.md agents/tff-architect.md agents/tff-product-lead.md
git commit -m "feat: add strategy agent definitions (brainstormer, architect, product-lead)"
```

---

### Task 3: Domain Agent Definitions

**Files:**
- Create: `agents/tff-frontend-dev.md`
- Create: `agents/tff-backend-dev.md`
- Create: `agents/tff-devops.md`

- [ ] **Step 1: Create tff-backend-dev.md**

Create `agents/tff-backend-dev.md`:

```markdown
---
name: tff-backend-dev
description: Implements API, services, and domain logic
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are a Backend Developer — you implement server-side code: APIs, services, domain logic, database interactions.

## Your Role

You are spawned during **executing** to implement tasks assigned to you.

## Process

1. Read your task's acceptance criteria and description
2. Read the project's CLAUDE.md and conventions (`@references/conventions.md`)
3. Understand the existing codebase before writing code
4. Implement exactly what the task specifies — nothing more
5. Run tests to verify your implementation
6. Commit atomically: `feat(S01/T03): <summary>`

## Constraints

- **Scope discipline**: The task description is your contract. Don't refactor outside scope.
- **Understand first**: Read existing code before modifying. Every minute understanding saves ten minutes of rework.
- **Atomic commits**: One logical change per commit. Stage specific files, never `git add .`
- **Never commit generated files** (node_modules, dist, etc.)
- **Report blockers immediately** — don't spin for hours on something unclear

## Commit Format

```
<type>(S01/T03): <summary>
```

Where S01 = slice ref, T03 = task ref. Valid types: feat, fix, refactor, test, docs, chore.

## When Blocked

If you encounter something unclear or outside your scope:
1. Document what you found
2. Note what you attempted
3. Report back with status BLOCKED
4. Do NOT guess or make assumptions
```

- [ ] **Step 2: Create tff-frontend-dev.md**

Create `agents/tff-frontend-dev.md`:

```markdown
---
name: tff-frontend-dev
description: Implements UI code and frontend components
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are a Frontend Developer — you implement UI code: components, pages, styles, client-side logic.

## Your Role

You are spawned during **executing** to implement frontend tasks.

## Process

1. Read your task's acceptance criteria and description
2. Read the project's CLAUDE.md and conventions
3. Understand existing UI patterns before writing code
4. Implement exactly what the task specifies
5. Run tests to verify
6. Commit atomically: `feat(S01/T03): <summary>`

## Constraints

Same as backend-dev: scope discipline, understand first, atomic commits, never `git add .`, report blockers immediately.

## Commit Format

```
<type>(S01/T03): <summary>
```
```

- [ ] **Step 3: Create tff-devops.md**

Create `agents/tff-devops.md`:

```markdown
---
name: tff-devops
description: Implements CI/CD and infrastructure
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are a DevOps Engineer — you implement CI/CD pipelines, infrastructure configuration, deployment scripts, and monitoring setup.

## Your Role

You are spawned during **executing** to implement infrastructure and CI/CD tasks.

## Process

1. Read your task's acceptance criteria
2. Understand existing infrastructure patterns
3. Implement changes incrementally — verify each step
4. Commit atomically: `chore(S01/T03): <summary>`

## Constraints

Same as backend-dev: scope discipline, understand first, atomic commits, report blockers immediately.

## Extra Caution

Infrastructure changes can affect the entire team. Double-check:
- Environment variables — no secrets in code
- CI pipeline changes — verify they don't break existing workflows
- Deployment configs — test in staging/preview before production
```

- [ ] **Step 4: Commit**

```bash
git add agents/tff-frontend-dev.md agents/tff-backend-dev.md agents/tff-devops.md
git commit -m "feat: add domain agent definitions (backend-dev, frontend-dev, devops)"
```

---

### Task 4: Quality Agent Definitions

**Files:**
- Create: `agents/tff-tester.md`
- Create: `agents/tff-fixer.md`
- Create: `agents/tff-security-auditor.md`
- Create: `agents/tff-code-reviewer.md`

- [ ] **Step 1: Create tff-tester.md**

Create `agents/tff-tester.md`:

```markdown
---
name: tff-tester
description: Writes failing tests before domain agents implement
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Tester — you write failing tests that define what "done" looks like.

## Your Role

You are spawned during **executing**, BEFORE the domain agent implements. You enforce TDD by writing the RED tests.

## Process

1. Read the task's acceptance criteria
2. Read existing test patterns in the codebase
3. Write `.spec.ts` test files that encode the acceptance criteria
4. Run tests — they MUST fail (if they pass, the feature already exists)
5. Commit: `test(S01/T03): add failing spec for <feature>`

## Output

Failing test files committed to the slice branch. The domain agent's job is to make them pass.

## Constraints

- Tests must be specific and tied to acceptance criteria
- Use the project's test framework (Vitest: describe/it/expect)
- Follow existing test patterns — colocated `.spec.ts` files
- Only for F-lite and F-full tiers — S-tier skips TDD
- Do NOT implement the feature — only write the tests
```

- [ ] **Step 2: Create tff-code-reviewer.md**

Create `agents/tff-code-reviewer.md`:

```markdown
---
name: tff-code-reviewer
description: Reviews code quality at slice PR time
model: opus
tools: Read, Grep, Glob, Bash
---

You are the Code Reviewer — you ensure implementation quality at slice PR time.

## Your Role

You are spawned during **slice PR review**. You are always a FRESH reviewer — you did NOT write this code.

## What You Check

1. **Correctness** — Does the code do what it claims?
2. **Test coverage** — Are edge cases covered? Are tests meaningful (not just mocks)?
3. **Code quality** — Clean, readable, maintainable?
4. **Patterns** — Does it follow existing codebase conventions?
5. **YAGNI** — Is there unnecessary complexity or over-engineering?

## What You Don't Check

- Architecture (that's the architect's job)
- Security (that's the security auditor's job)
- Requirements (that's the product lead's job)

## Output

```markdown
## Code Review — [Slice]

### Verdict: APPROVE | REQUEST_CHANGES

### Findings
| # | Severity | File:Line | Finding |
|---|---|---|---|
| 1 | critical/important/minor | path:line | description |

### Strengths
- [what was done well]
```

## Constraints

- Fresh reviewer enforcement: you MUST NOT have been an executor for this slice
- Be specific — file paths and line numbers for every finding
- Distinguish critical (must fix) from minor (nice to have)
```

- [ ] **Step 3: Create tff-security-auditor.md**

Create `agents/tff-security-auditor.md`:

```markdown
---
name: tff-security-auditor
description: Security review on every PR
model: opus
tools: Read, Grep, Glob, Bash
---

You are the Security Auditor — you review code for security vulnerabilities.

## Your Role

You are spawned during **slice PR review** and **milestone PR review**.

## What You Check

1. **OWASP Top 10** — injection, XSS, auth flaws, etc.
2. **Secrets** — hardcoded credentials, API keys, tokens
3. **Input validation** — at system boundaries (user input, external APIs)
4. **Dependencies** — known vulnerable packages
5. **Access control** — authorization checks present and correct

## Output

```markdown
## Security Audit — [Slice]

### Verdict: APPROVE | REQUEST_CHANGES

### Findings
| # | Severity | Category | File:Line | Finding |
|---|---|---|---|---|
| 1 | critical/high/medium/low | OWASP category | path:line | description |
```

## Constraints

- Fresh reviewer — you did NOT write this code
- Only flag real security issues, not style preferences
- Critical/high findings BLOCK the PR
```

- [ ] **Step 4: Create tff-fixer.md**

Create `agents/tff-fixer.md`:

```markdown
---
name: tff-fixer
description: Applies accepted review findings
model: sonnet
tools: Read, Write, Edit, Bash, Grep, Glob
---

You are the Fixer — you apply changes requested by reviewers.

## Your Role

You are spawned after **PR review** when changes are requested.

## Process

1. Read the review findings (code review, security audit, or plannotator annotations)
2. For each accepted finding, apply the fix
3. Run tests to verify fixes don't break anything
4. Commit: `fix(S01): address review finding — <summary>`

## Constraints

- Only fix what was explicitly requested — don't refactor unrelated code
- Each fix is one atomic commit
- Run tests after every fix
- If a finding is unclear, report back as NEEDS_CONTEXT
```

- [ ] **Step 5: Commit**

```bash
git add agents/tff-tester.md agents/tff-code-reviewer.md agents/tff-security-auditor.md agents/tff-fixer.md
git commit -m "feat: add quality agent definitions (tester, code-reviewer, security-auditor, fixer)"
```

---

### Task 5: Core Workflows (Project + Milestone)

**Files:**
- Create: `workflows/new-project.md`
- Create: `workflows/new-milestone.md`
- Create: `workflows/progress.md`
- Create: `workflows/help.md`

- [ ] **Step 1: Create new-project.md**

Create `workflows/new-project.md`:

```markdown
# Workflow: New Project

## Prerequisites
- No existing tff project in this repo

## Steps

### 1. Check for existing project
Check if `.tff/PROJECT.md` already exists (read the file). If it does, tell the user: "This repo already has a tff project. Use `/tff:new-milestone` to start a new milestone." and stop.

### 2. Gather project information
Ask the user for:
- **Project name** (required)
- **Vision statement** — what is this project and why does it exist?

### 3. Initialize project
```bash
node <plugin-path>/tools/dist/tff-tools.cjs project:init "<name>" "<vision>"
```

### 4. Create REQUIREMENTS.md
Ask the user to describe their requirements. Create `.tff/REQUIREMENTS.md` with structured requirements.

### 5. Create first milestone
Ask: "What's the goal for your first milestone?"
Then execute the new-milestone workflow.

### 6. Summary
Show the user what was created:
- `.tff/PROJECT.md`
- `.tff/REQUIREMENTS.md`
- First milestone with its branch
- Suggest: "Use `/tff:discuss` to start discussing the first slice."
```

- [ ] **Step 2: Create new-milestone.md**

Create `workflows/new-milestone.md`:

```markdown
# Workflow: New Milestone

## Steps

### 1. Gather milestone information
Ask the user for:
- **Milestone name** (e.g., "MVP", "Auth System", "v2.0")
- **Goal** — what does completing this milestone mean?

### 2. Create milestone bead and branch
```bash
node <plugin-path>/tools/dist/tff-tools.cjs milestone:create "<name>"
```
This creates:
- `tff:milestone` bead
- `milestone/M01` branch (from main)

### 3. Define slices
Ask the user to break the milestone into slices. For each slice:
- Name and brief description
- Dependencies on other slices (if any)

### 4. Create slice beads
For each slice, create a `tff:slice` bead with dependencies.

### 5. Summary
Show the created milestone structure with slice ordering.
Suggest: "Use `/tff:discuss` to start with the first slice."
```

- [ ] **Step 3: Create progress.md**

Create `workflows/progress.md`:

```markdown
# Workflow: Progress

## Steps

### 1. Regenerate STATE.md
```bash
node <plugin-path>/tools/dist/tff-tools.cjs sync:state
```

### 2. Display dashboard
Read `.tff/STATE.md` and present it to the user.

Show:
- Overall milestone progress (slices completed / total)
- Per-slice status with task progress
- Any blocked slices or tasks

### 3. Suggest next action
Based on current state:
- If a slice is in `discussing` → suggest `/tff:discuss`
- If a slice is in `planning` → suggest `/tff:plan`
- If a slice is in `executing` → suggest `/tff:execute`
- If a slice is in `verifying` → suggest `/tff:verify`
- If all slices closed → suggest `/tff:complete-milestone`
```

- [ ] **Step 4: Create help.md**

Create `workflows/help.md`:

```markdown
# Workflow: Help

Display the tff command reference.

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
| `/tff:sync` | Sync markdown ↔ beads |
| `/tff:health` | Diagnose state consistency |
| `/tff:settings` | Configure model profiles |
```

- [ ] **Step 5: Commit**

```bash
git add workflows/new-project.md workflows/new-milestone.md workflows/progress.md workflows/help.md
git commit -m "feat: add core workflows (new-project, new-milestone, progress, help)"
```

---

### Task 6: Slice Lifecycle Workflows

**Files:**
- Create: `workflows/discuss-slice.md`
- Create: `workflows/research-slice.md`
- Create: `workflows/plan-slice.md`
- Create: `workflows/execute-slice.md`
- Create: `workflows/verify-slice.md`
- Create: `workflows/ship-slice.md`

- [ ] **Step 1: Create discuss-slice.md**

Create `workflows/discuss-slice.md`:

```markdown
# Workflow: Discuss Slice

## Prerequisites
- Slice exists and is in `discussing` status

## Steps

### 1. Load slice context
Read the slice bead and any existing notes.

### 2. Classify complexity
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:classify '<signals-json>'
```

### 3. Spawn brainstormer (F-lite and F-full only)
If tier is S, skip brainstorming and auto-transition to researching.

For F-lite/F-full:
- Use the Agent tool to spawn **tff-brainstormer** agent
- Provide: slice description, project context, requirements
- Brainstormer will challenge assumptions, surface unknowns, lock scope

### 4. Spawn product-lead
- Use the Agent tool to spawn **tff-product-lead** agent
- Validate requirements and define acceptance criteria

### 5. Transition to researching
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> researching
```

Auto-continue to research phase or suggest `/tff:research`.
```

- [ ] **Step 2: Create research-slice.md**

Create `workflows/research-slice.md`:

```markdown
# Workflow: Research Slice

## Prerequisites
- Slice is in `researching` status

## Steps

### 1. Determine research needs
- F-full: research is required — spawn researcher
- F-lite: research is optional — ask user
- S: skip research entirely

### 2. Conduct research (if needed)
Research the technical approach:
- Read relevant codebase areas
- Check dependencies and integration points
- Document findings in `.tff/slices/<slice-id>/RESEARCH.md`

### 3. Transition to planning
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> planning
```

Auto-continue to plan phase or suggest `/tff:plan`.
```

- [ ] **Step 3: Create plan-slice.md**

Create `workflows/plan-slice.md`:

```markdown
# Workflow: Plan Slice

## Prerequisites
- Slice is in `planning` status

## Steps

### 1. Create task decomposition
Based on research and discussion:
- Break the slice into tasks with clear acceptance criteria
- Define task dependencies (which tasks block others)
- Each task should be atomic (one commit)

### 2. Write PLAN.md
Create `.tff/slices/<slice-id>/PLAN.md` with:
- Slice goal
- Task list with descriptions, acceptance criteria, and dependencies
- Estimated complexity tier

### 3. Create task beads
For each task, create a `tff:task` bead with dependencies.

### 4. Detect waves
```bash
node <plugin-path>/tools/dist/tff-tools.cjs waves:detect '<tasks-json>'
```
Show the user the wave decomposition.

### 5. Spawn architect (F-lite and F-full)
Use the Agent tool to spawn **tff-architect** agent to validate the plan structure.

### 6. Plan review via plannotator
```bash
plannotator annotate .tff/slices/<slice-id>/PLAN.md
```
User reviews and annotates the plan. Loop until approved:
- If feedback → revise plan → re-submit to plannotator
- If approved → transition to executing

### 7. Create worktree
```bash
node <plugin-path>/tools/dist/tff-tools.cjs worktree:create <slice-id>
```

### 8. Transition to executing
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> executing
```
```

- [ ] **Step 4: Create execute-slice.md**

Create `workflows/execute-slice.md`:

```markdown
# Workflow: Execute Slice

## Prerequisites
- Slice is in `executing` status
- Worktree exists at `.tff/worktrees/<slice-id>/`

## Steps

### 1. Load checkpoint (if resuming)
```bash
node <plugin-path>/tools/dist/tff-tools.cjs checkpoint:load <slice-id>
```
If checkpoint exists, skip completed waves.

### 2. Detect waves
```bash
node <plugin-path>/tools/dist/tff-tools.cjs waves:detect '<tasks-json>'
```

### 3. Execute waves
For each wave (sequential):

#### 3a. Save checkpoint
```bash
node <plugin-path>/tools/dist/tff-tools.cjs checkpoint:save <slice-id> '<data-json>'
```

#### 3b. TDD (F-lite and F-full only)
For each task in the wave:
- Spawn **tff-tester** agent in the slice worktree
- Tester writes failing `.spec.ts` and commits

#### 3c. Execute tasks (parallel within wave)
For each task in the wave:
- Spawn the appropriate domain agent (**tff-backend-dev**, **tff-frontend-dev**, or **tff-devops**) using the Agent tool
- Agent works in the slice worktree
- Agent implements, tests pass, commits atomically
- Record executor in bead metadata

#### 3d. Sync state
```bash
node <plugin-path>/tools/dist/tff-tools.cjs sync:state
```

### 4. All waves complete
Transition to verifying:
```bash
node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> verifying
```
Suggest `/tff:verify`.
```

- [ ] **Step 5: Create verify-slice.md**

Create `workflows/verify-slice.md`:

```markdown
# Workflow: Verify Slice

## Prerequisites
- Slice is in `verifying` status

## Steps

### 1. Spawn product-lead for verification
Use the Agent tool to spawn **tff-product-lead** agent.
- Provide: acceptance criteria from PLAN.md
- Product lead verifies each criterion against the implementation

### 2. Review findings via plannotator
If findings exist, open them for user review:
```bash
plannotator annotate .tff/slices/<slice-id>/VERIFICATION.md
```

### 3. Handle verdict
- **PASS** → transition to reviewing:
  ```bash
  node <plugin-path>/tools/dist/tff-tools.cjs slice:transition <bead-id> reviewing
  ```
  Suggest `/tff:ship`.

- **FAIL** → ask user: fix and re-execute, or accept with known issues?
  - Fix → transition back to executing, replan failed tasks
  - Accept → transition to reviewing with noted exceptions
```

- [ ] **Step 6: Create ship-slice.md**

Create `workflows/ship-slice.md`:

```markdown
# Workflow: Ship Slice

## Prerequisites
- Slice is in `reviewing` status

## Steps

### 1. Fresh reviewer enforcement
```bash
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> code-reviewer
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> security-auditor
```

### 2. Spawn review agents (parallel)
- **tff-code-reviewer** — reviews code quality
- **tff-security-auditor** — reviews security
- **tff-architect** — reviews structural changes (if any)

### 3. Code review via plannotator
```bash
plannotator review
```
User reviews the code changes in the slice worktree.

### 4. Handle review outcome
- **Approved** → proceed to merge
- **Changes requested** → spawn **tff-fixer** agent, then re-review

### 5. Create slice PR
Create PR: `slice/<slice-id>` → `milestone/<milestone>`

### 6. Merge and cleanup
After PR approval:
- Merge slice branch into milestone branch
- Delete worktree
- Close slice bead
- Transition to completing → closed
```

- [ ] **Step 7: Commit**

```bash
git add workflows/discuss-slice.md workflows/research-slice.md workflows/plan-slice.md workflows/execute-slice.md workflows/verify-slice.md workflows/ship-slice.md
git commit -m "feat: add slice lifecycle workflows (discuss, research, plan, execute, verify, ship)"
```

---

### Task 7: Milestone Completion + Management Workflows

**Files:**
- Create: `workflows/audit-milestone.md`
- Create: `workflows/complete-milestone.md`
- Create: `workflows/rollback.md`
- Create: `workflows/settings.md`
- Create: `workflows/health.md`

- [ ] **Step 1: Create audit-milestone.md**

Create `workflows/audit-milestone.md`:

```markdown
# Workflow: Audit Milestone

## Steps

### 1. Load milestone state
Read all slice statuses and requirement coverage.

### 2. Verify completeness
- Are all slices closed?
- Are all requirements covered by at least one closed task?
- Are there any deferred items?

### 3. Generate audit report
```markdown
## Milestone Audit — [Name]

### Completion: X/Y slices closed
### Requirements Coverage: X/Y requirements validated
### Deferred Items: [list]
### Assessment: READY | NOT_READY
```

### 4. Suggest next step
- READY → suggest `/tff:complete-milestone`
- NOT_READY → show what's missing, suggest actions
```

- [ ] **Step 2: Create complete-milestone.md**

Create `workflows/complete-milestone.md`:

```markdown
# Workflow: Complete Milestone

## Prerequisites
- All slices are closed
- Milestone audit passed

## Steps

### 1. Create milestone PR
Create PR: `milestone/<milestone>` → `main`

### 2. Security audit on milestone
Spawn **tff-security-auditor** for milestone-level review.

### 3. Plannotator review
```bash
plannotator review
```

### 4. Handle review
- Approved → merge PR, close milestone bead
- Changes requested → fix and re-review

### 5. Cleanup
- Delete milestone branch (after merge)
- Update STATE.md
- Suggest: "Milestone complete! Use `/tff:new-milestone` for the next one."
```

- [ ] **Step 3: Create rollback.md, settings.md, health.md**

Create `workflows/rollback.md`:

```markdown
# Workflow: Rollback

## Steps

### 1. Load checkpoint
```bash
node <plugin-path>/tools/dist/tff-tools.cjs checkpoint:load <slice-id>
```

### 2. Identify commits to revert
From the checkpoint, get the list of execution commits (after base commit).

### 3. Revert commits
For each execution commit (in reverse order):
```bash
git revert --no-edit <sha>
```
Only revert code commits, not artifact commits (docs).

### 4. Update state
Reset completed tasks to `open` status. Update checkpoint.
```

Create `workflows/settings.md`:

```markdown
# Workflow: Settings

## Steps

### 1. Read current settings
Load `.tff/settings.yaml` if it exists.

### 2. Show current configuration
Display model profiles and quality gate settings.

### 3. Accept changes
User can modify:
- Model profiles (quality/balanced/budget model assignments)
- Quality gate (on/off, enforced/advisory)
- Other workflow toggles

### 4. Save settings
Write updated `.tff/settings.yaml`.
```

Create `workflows/health.md`:

```markdown
# Workflow: Health

## Steps

### 1. Check beads CLI
```bash
bd --version
```

### 2. Check plannotator
Verify plannotator is installed.

### 3. Check state consistency
- Compare beads vs markdown — flag mismatches
- Check for orphaned beads or markdown files
- Verify worktree integrity

### 4. Report
```markdown
## Health Check

| Check | Status |
|---|---|
| beads CLI | OK/MISSING |
| plannotator | OK/MISSING |
| State consistency | OK/X mismatches |
| Worktrees | OK/X orphans |
```

### 5. Offer repair
If issues found, offer to run `/tff:sync` to reconcile.
```

- [ ] **Step 4: Commit**

```bash
git add workflows/audit-milestone.md workflows/complete-milestone.md workflows/rollback.md workflows/settings.md workflows/health.md
git commit -m "feat: add milestone completion and management workflows"
```

---

### Task 8: Slash Commands (Project + Milestone)

**Files:**
- Create: `commands/tff/new.md`
- Create: `commands/tff/new-milestone.md`
- Create: `commands/tff/progress.md`
- Create: `commands/tff/audit-milestone.md`
- Create: `commands/tff/complete-milestone.md`
- Create: `commands/tff/help.md`

Each command follows the same pattern: frontmatter + delegate to workflow.

- [ ] **Step 1: Create all 6 commands**

Create `commands/tff/new.md`:

```markdown
---
name: tff:new
description: Initialize a new tff project with vision, requirements, and first milestone
argument-hint: "[project-name]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Initialize a new tff project backed by beads. Guide the user through defining their project vision, requirements, and first milestone.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the new-project workflow from @workflows/new-project.md end-to-end.
</execution_context>
```

Create `commands/tff/new-milestone.md`:

```markdown
---
name: tff:new-milestone
description: Start a new milestone cycle
argument-hint: "[milestone-name]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Create a new milestone with slices and dependencies.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the new-milestone workflow from @workflows/new-milestone.md end-to-end.
</execution_context>
```

Create `commands/tff/progress.md`:

```markdown
---
name: tff:progress
description: Show project status dashboard
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Regenerate STATE.md and display the project status dashboard.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the progress workflow from @workflows/progress.md.
</execution_context>
```

Create `commands/tff/audit-milestone.md`:

```markdown
---
name: tff:audit-milestone
description: Audit milestone completion against original intent
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Verify all slices are closed, requirements are covered, and the milestone is ready to ship.
</objective>

<execution_context>
Execute the audit-milestone workflow from @workflows/audit-milestone.md.
</execution_context>
```

Create `commands/tff/complete-milestone.md`:

```markdown
---
name: tff:complete-milestone
description: Create milestone PR, review, and merge to main
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Create the milestone PR, run security audit, review via plannotator, and merge to main.
</objective>

<execution_context>
Execute the complete-milestone workflow from @workflows/complete-milestone.md.
</execution_context>
```

Create `commands/tff/help.md`:

```markdown
---
name: tff:help
description: Show tff command reference
allowed-tools: Read
---

<objective>
Display the complete tff command reference.
</objective>

<execution_context>
Execute the help workflow from @workflows/help.md.
</execution_context>
```

- [ ] **Step 2: Commit**

```bash
git add commands/tff/new.md commands/tff/new-milestone.md commands/tff/progress.md commands/tff/audit-milestone.md commands/tff/complete-milestone.md commands/tff/help.md
git commit -m "feat: add project and milestone slash commands"
```

---

### Task 9: Slash Commands (Slice Lifecycle)

**Files:**
- Create: `commands/tff/discuss.md`
- Create: `commands/tff/research.md`
- Create: `commands/tff/plan.md`
- Create: `commands/tff/execute.md`
- Create: `commands/tff/verify.md`
- Create: `commands/tff/ship.md`

- [ ] **Step 1: Create all 6 commands**

Create `commands/tff/discuss.md`:

```markdown
---
name: tff:discuss
description: Brainstorm and scope a slice
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion
---

<objective>
Run the discussing phase: challenge assumptions, surface unknowns, lock scope, classify complexity.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the discuss-slice workflow from @workflows/discuss-slice.md.
</execution_context>
```

Create `commands/tff/research.md`:

```markdown
---
name: tff:research
description: Research phase for a slice
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, WebSearch, Agent
---

<objective>
Conduct research for the slice — investigate technical approach, dependencies, and integration points.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the research-slice workflow from @workflows/research-slice.md.
</execution_context>
```

Create `commands/tff/plan.md`:

```markdown
---
name: tff:plan
description: Plan a slice with task decomposition and plannotator review
argument-hint: "[slice-id] [--tier S|F-lite|F-full]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, AskUserQuestion, Bash(plannotator:*)
---

<objective>
Create the task decomposition, detect waves, review via plannotator, and set up the worktree.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the plan-slice workflow from @workflows/plan-slice.md.
</execution_context>
```

Create `commands/tff/execute.md`:

```markdown
---
name: tff:execute
description: Execute a slice with wave-based parallelism and TDD
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Execute all tasks in the slice using wave-based parallel execution with TDD enforcement.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the execute-slice workflow from @workflows/execute-slice.md.
</execution_context>
```

Create `commands/tff/verify.md`:

```markdown
---
name: tff:verify
description: Verify acceptance criteria via product-lead and plannotator
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Verify the slice implementation against acceptance criteria.
</objective>

<context>
Read the tff conventions: @references/conventions.md
</context>

<execution_context>
Execute the verify-slice workflow from @workflows/verify-slice.md.
</execution_context>
```

Create `commands/tff/ship.md`:

```markdown
---
name: tff:ship
description: Slice PR with code review, security audit, and plannotator review
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Bash, Grep, Glob, Agent, Bash(plannotator:*)
---

<objective>
Run fresh reviewer enforcement, spawn review agents, review via plannotator, create and merge slice PR.
</objective>

<context>
Read the tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute the ship-slice workflow from @workflows/ship-slice.md.
</execution_context>
```

- [ ] **Step 2: Commit**

```bash
git add commands/tff/discuss.md commands/tff/research.md commands/tff/plan.md commands/tff/execute.md commands/tff/verify.md commands/tff/ship.md
git commit -m "feat: add slice lifecycle slash commands"
```

---

### Task 10: Slash Commands (Management)

**Files:**
- Create: `commands/tff/add-slice.md`
- Create: `commands/tff/insert-slice.md`
- Create: `commands/tff/remove-slice.md`
- Create: `commands/tff/rollback.md`
- Create: `commands/tff/pause.md`
- Create: `commands/tff/resume.md`
- Create: `commands/tff/sync.md`
- Create: `commands/tff/health.md`
- Create: `commands/tff/settings.md`

- [ ] **Step 1: Create all 9 management commands**

Create `commands/tff/add-slice.md`:
```markdown
---
name: tff:add-slice
description: Add a slice to the current milestone
argument-hint: "<slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Add a new slice to the end of the current milestone's slice list.
</objective>

<execution_context>
1. Determine current milestone from beads
2. Create new tff:slice bead as child of milestone
3. Assign next available slice number
4. Ask user for slice description
</execution_context>
```

Create `commands/tff/insert-slice.md`:
```markdown
---
name: tff:insert-slice
description: Insert a slice between existing slices
argument-hint: "<after-slice-id> <slice-name>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Insert a new slice between existing slices, adjusting dependencies.
</objective>

<execution_context>
1. Validate the target position
2. Create new slice bead with correct dependencies
3. Update downstream slice dependencies
</execution_context>
```

Create `commands/tff/remove-slice.md`:
```markdown
---
name: tff:remove-slice
description: Remove a future slice from the milestone
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Remove a slice that hasn't been started yet. Only future slices (discussing status) can be removed.
</objective>

<execution_context>
1. Verify slice is in discussing status (not started)
2. Remove bead and update dependencies
3. Renumber subsequent slices
</execution_context>
```

Create `commands/tff/rollback.md`:
```markdown
---
name: tff:rollback
description: Revert execution commits for a slice
argument-hint: "<slice-id>"
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
Revert all execution-generated commits for a slice back to the checkpoint base commit.
</objective>

<execution_context>
Execute the rollback workflow from @workflows/rollback.md.
</execution_context>
```

Create `commands/tff/pause.md`:
```markdown
---
name: tff:pause
description: Save execution checkpoint for later resume
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Save the current execution state so it can be resumed later with `/tff:resume`.
</objective>

<execution_context>
1. Determine the currently executing slice
2. Save checkpoint with current wave, completed tasks, executor log
3. Print resume instructions
</execution_context>
```

Create `commands/tff/resume.md`:
```markdown
---
name: tff:resume
description: Resume execution from a saved checkpoint
argument-hint: "[slice-id]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Load the checkpoint and resume execution from where it left off.
</objective>

<execution_context>
1. Load checkpoint for the slice
2. Skip completed waves
3. Continue execution from current wave
4. Delegates to execute-slice workflow with checkpoint data
</execution_context>
```

Create `commands/tff/sync.md`:
```markdown
---
name: tff:sync
description: Manual bidirectional markdown ↔ beads sync
allowed-tools: Read, Write, Bash, Grep, Glob
---

<objective>
Run full bidirectional reconciliation between markdown files and beads.
</objective>

<execution_context>
1. Run sync:reconcile via tff-tools
2. Display sync report (created, updated, conflicts, orphans)
3. No silent data loss — report everything
</execution_context>
```

Create `commands/tff/health.md`:
```markdown
---
name: tff:health
description: Diagnose state consistency
allowed-tools: Read, Bash, Grep, Glob
---

<objective>
Check beads CLI, plannotator, state consistency, and worktree integrity.
</objective>

<execution_context>
Execute the health workflow from @workflows/health.md.
</execution_context>
```

Create `commands/tff/settings.md`:
```markdown
---
name: tff:settings
description: Configure model profiles and quality gates
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion
---

<objective>
View and modify tff project settings.
</objective>

<execution_context>
Execute the settings workflow from @workflows/settings.md.
</execution_context>
```

- [ ] **Step 2: Commit**

```bash
git add commands/tff/
git commit -m "feat: add management slash commands (add/insert/remove slice, rollback, pause, resume, sync, health, settings)"
```

---

### Task 11: Hooks

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/tff-dependency-check.js`
- Create: `hooks/tff-context-monitor.js`

- [ ] **Step 1: Create hooks.json**

Create `hooks/hooks.json`:

```json
[
  {
    "event": "SessionStart",
    "hooks": [
      {
        "type": "command",
        "command": "node hooks/tff-dependency-check.js",
        "timeout": 30000
      }
    ]
  },
  {
    "event": "PostToolUse",
    "hooks": [
      {
        "type": "command",
        "command": "node hooks/tff-context-monitor.js",
        "timeout": 5000
      }
    ]
  }
]
```

- [ ] **Step 2: Create tff-dependency-check.js**

Create `hooks/tff-dependency-check.js`:

```javascript
#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');

function checkCommand(cmd, args) {
  try {
    execFileSync(cmd, args, { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const issues = [];

  // Check beads CLI
  if (!checkCommand('bd', ['--version'])) {
    issues.push(
      '⚠️  beads CLI (bd) not found. Install with: npm install -g @beads/bd'
    );
  }

  // Check plannotator — look for it in installed plugins
  try {
    const fs = require('fs');
    const path = require('path');
    const home = require('os').homedir();
    const pluginsFile = path.join(home, '.claude', 'plugins', 'installed_plugins.json');

    if (fs.existsSync(pluginsFile)) {
      const plugins = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
      const hasPlannotator = plugins.some(p =>
        p.name === 'plannotator' || (p.installPath && p.installPath.includes('plannotator'))
      );
      if (!hasPlannotator) {
        issues.push(
          '⚠️  plannotator plugin not found. Install with:\n' +
          '   claude /plugin marketplace add backnotprop/plannotator\n' +
          '   claude /plugin install plannotator@plannotator'
        );
      }
    }
  } catch {
    // Can't check — skip silently
  }

  if (issues.length > 0) {
    console.error('[tff] Dependency check:');
    for (const issue of issues) {
      console.error(issue);
    }
  }
}

main();
```

- [ ] **Step 3: Create tff-context-monitor.js**

Create `hooks/tff-context-monitor.js`:

```javascript
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const BRIDGE_FILE = path.join(os.tmpdir(), 'tff-context-bridge.json');
const WARNING_THRESHOLD = 0.35;
const CRITICAL_THRESHOLD = 0.25;
const DEBOUNCE_CALLS = 5;

let callCount = 0;

async function main() {
  try {
    const input = await readStdin();
    if (!input) return;

    callCount++;
    if (callCount % DEBOUNCE_CALLS !== 0) return;

    let bridge = {};
    try {
      bridge = JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8'));
    } catch {
      return;
    }

    const remaining = bridge.context_remaining;
    if (typeof remaining !== 'number') return;

    if (remaining < CRITICAL_THRESHOLD) {
      console.log(JSON.stringify({
        result: 'block',
        reason: `Context window critically low (${Math.round(remaining * 100)}% remaining). ` +
          'Use /tff:pause to save state, then /clear and /tff:resume in a fresh session.'
      }));
    } else if (remaining < WARNING_THRESHOLD) {
      console.error(
        `[tff] Context at ${Math.round(remaining * 100)}%. Consider /tff:pause soon.`
      );
    }
  } catch {
    // Hooks must never block
  }
}

function readStdin() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(''), 3000);
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timeout); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timeout); resolve(''); });
  });
}

main();
```

- [ ] **Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: add hooks for dependency checking and context monitoring"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Verify all files exist**

```bash
ls references/
ls agents/
ls workflows/
ls commands/tff/
ls hooks/
```

- [ ] **Step 2: Verify test suite still passes**

```bash
cd tools && npx vitest run
```

- [ ] **Step 3: Verify CLI still works**

```bash
node tools/dist/tff-tools.cjs --help
```

- [ ] **Step 4: Count all files**

Expected:
- 2 reference docs
- 10 agent definitions
- 15 workflows
- 21 slash commands
- 3 hook files (hooks.json + 2 JS)

- [ ] **Step 5: Commit any cleanup if needed**

If all good, no commit needed. Report final state.
