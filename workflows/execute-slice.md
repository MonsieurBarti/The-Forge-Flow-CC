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
