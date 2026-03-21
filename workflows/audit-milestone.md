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
