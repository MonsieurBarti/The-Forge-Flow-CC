# Workflow: Settings

## Context

Read the orchestrator pattern: @references/orchestrator-pattern.md
Read conventions: @references/conventions.md

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

### Next Step

Based on the current slice/milestone state, suggest the appropriate next command from @references/next-steps.md.
