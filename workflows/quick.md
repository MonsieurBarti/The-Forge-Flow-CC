# Workflow: Quick (S-tier shortcut)

Skip discuss and research. Go straight to plan, execute, ship.

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

## Prerequisites
- Active milestone exists

## Steps

### 1. Create slice as S-tier
Auto-classify as S. Create slice bead and worktree.

### 2. Plan (lightweight)
Ask user to describe the fix/change in 1-2 sentences.
Create a single task in PLAN.md.
Skip plannotator review for S-tier (too lightweight to review).

### 3. Execute
Single wave, single task. Spawn the appropriate domain agent.
No TDD (S-tier skips TDD).

### 4. Verify
Quick sanity check — spawn product-lead to verify the fix.

### 5. Ship
Run fresh reviewer enforcement.
Spec review + code review (but lightweight — S-tier).
Create slice PR, merge to milestone.

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
