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
