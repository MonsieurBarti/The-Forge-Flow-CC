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
