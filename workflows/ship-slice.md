# Workflow: Ship Slice

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Slice is in `reviewing` status

## Steps

### 1. Fresh reviewer enforcement
```bash
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> code-reviewer
node <plugin-path>/tools/dist/tff-tools.cjs review:check-fresh <slice-id> security-auditor
```

### 2. Stage 1: Spec Compliance Review
Spawn **tff-spec-reviewer** agent.
- Provide: acceptance criteria from PLAN.md, implementation code
- If FAIL → spawn **tff-fixer** agent to fix gaps → re-run spec review
- Loop until PASS
- **Code quality review does NOT start until spec compliance passes**

### 3. Stage 2: Code Quality Review
Only after spec compliance PASS.
Spawn **tff-code-reviewer** agent.
- If REQUEST_CHANGES → spawn **tff-fixer** → re-run code quality review
- Loop until APPROVE

### 4. Security Audit
Spawn **tff-security-auditor** agent.
- Critical/high findings block the PR
- If findings → spawn **tff-fixer** → re-audit

### 5. Plannotator review
```bash
plannotator review
```
User reviews the code changes in the slice worktree.

### 6. Create slice PR
Create PR: `slice/<slice-id>` → `milestone/<milestone>`

### 7. Merge and cleanup
After PR approval:
- Merge slice branch into milestone branch
- Delete worktree
- Close slice bead
- Transition to completing → closed

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
