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
