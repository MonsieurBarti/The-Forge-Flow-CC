# Plan 4: Remaining CLI Commands + Application Services

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 13 remaining `tff-tools.cjs` CLI commands with their backing application services, making all workflows functional end-to-end.

**Architecture:** Each CLI command follows the pattern: parse args → instantiate real adapters → call application service → output JSON. Application services depend only on domain ports (tested with in-memory adapters). TDD for application services, type-check for CLI commands.

**Tech Stack:** TypeScript (strict), Zod v4, Vitest, Node.js 20+

**Spec:** `docs/superpowers/specs/2026-03-21-the-forge-flow-design.md`

**Depends on:** Plans 1-3 (domain + application + infrastructure + plugin layer)

**Existing services:** initProject, classifyComplexity, transitionSlice, detectWaves, enforceFreshReviewer, generateState, saveCheckpoint, loadCheckpoint

**Existing CLI commands:** project:init, slice:classify, waves:detect, review:check-fresh

**Stubbed commands to implement:** project:get, milestone:create, milestone:list, slice:create, slice:transition, sync:state, sync:reconcile, worktree:create, worktree:delete, worktree:list, review:record, checkpoint:save, checkpoint:load

---

## File Structure

```
tools/src/
  application/
    project/
      get-project.ts
      get-project.spec.ts
    milestone/
      create-milestone.ts
      create-milestone.spec.ts
      list-milestones.ts
      list-milestones.spec.ts
    slice/
      create-slice.ts
      create-slice.spec.ts
    worktree/
      create-worktree.ts
      create-worktree.spec.ts
      delete-worktree.ts
      delete-worktree.spec.ts
      list-worktrees.ts
      list-worktrees.spec.ts
    review/
      record-review.ts
      record-review.spec.ts

  cli/commands/
    project-get.cmd.ts
    milestone-create.cmd.ts
    milestone-list.cmd.ts
    slice-create.cmd.ts
    slice-transition.cmd.ts
    sync-state.cmd.ts
    sync-reconcile.cmd.ts
    worktree-create.cmd.ts
    worktree-delete.cmd.ts
    worktree-list.cmd.ts
    review-record.cmd.ts
    checkpoint-save.cmd.ts
    checkpoint-load.cmd.ts
```

---

### Task 0: Add NOT_FOUND Error Code

Before any new services, add `NOT_FOUND` to the domain error codes.

- [ ] **Step 1: Update domain-error.ts**

Add `'NOT_FOUND'` to the `DomainErrorCodeSchema` enum in `tools/src/domain/errors/domain-error.ts`.

- [ ] **Step 2: Run tests, type check**

- [ ] **Step 3: Commit**

```bash
git add tools/src/domain/errors/domain-error.ts
git commit -m "feat: add NOT_FOUND error code to domain errors"
```

---

### Task 1: GetProject Service + CLI

**Files:**
- Create: `tools/src/application/project/get-project.ts`
- Create: `tools/src/application/project/get-project.spec.ts`
- Create: `tools/src/cli/commands/project-get.cmd.ts`

- [ ] **Step 1: Write failing test**

Create `tools/src/application/project/get-project.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getProject } from './get-project.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('getProject', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should return project data when project exists', async () => {
    beadStore.seed([{
      id: 'proj-1',
      label: 'tff:project',
      title: 'my-app',
      status: 'open',
      design: 'A great app',
    }]);
    artifactStore.seed({ '.tff/PROJECT.md': '# my-app\n\n## Vision\n\nA great app\n' });

    const result = await getProject({ beadStore, artifactStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.title).toBe('my-app');
      expect(result.data.design).toBe('A great app');
    }
  });

  it('should return error when no project exists', async () => {
    const result = await getProject({ beadStore, artifactStore });
    expect(isErr(result)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement getProject**

Create `tools/src/application/project/get-project.ts`:

```typescript
import { type Result, Err, isOk } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface GetProjectDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

export const getProject = async (
  deps: GetProjectDeps,
): Promise<Result<BeadData, DomainError>> => {
  const result = await deps.beadStore.list({ label: 'tff:project' });
  if (!isOk(result)) return result;

  if (result.data.length === 0) {
    return Err(createDomainError(
      'NOT_FOUND',
      'No tff project found in this repository. Run /tff:new to create one.',
    ));
  }

  return { ok: true, data: result.data[0] };
};
```

- [ ] **Step 4: Create CLI command**

Create `tools/src/cli/commands/project-get.cmd.ts`:

```typescript
import { getProject } from '../../application/project/get-project.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const projectGetCmd = async (_args: string[]): Promise<string> => {
  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await getProject({ beadStore, artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 5: Run tests, type check**

- [ ] **Step 6: Commit**

```bash
git add tools/src/application/project/get-project.ts tools/src/application/project/get-project.spec.ts tools/src/cli/commands/project-get.cmd.ts
git commit -m "feat: add getProject service and project:get CLI command"
```

---

### Task 2: CreateMilestone + ListMilestones Services + CLI

**Files:**
- Create: `tools/src/application/milestone/create-milestone.ts`
- Create: `tools/src/application/milestone/create-milestone.spec.ts`
- Create: `tools/src/application/milestone/list-milestones.ts`
- Create: `tools/src/application/milestone/list-milestones.spec.ts`
- Create: `tools/src/cli/commands/milestone-create.cmd.ts`
- Create: `tools/src/cli/commands/milestone-list.cmd.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/milestone/create-milestone.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMilestoneUseCase } from './create-milestone.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { isOk } from '../../domain/result.js';

describe('createMilestoneUseCase', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;
  let gitOps: InMemoryGitOps;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
    gitOps = new InMemoryGitOps();
    beadStore.seed([{ id: 'proj-1', label: 'tff:project', title: 'app', status: 'open' }]);
  });

  it('should create a milestone with bead and branch', async () => {
    const result = await createMilestoneUseCase(
      { projectBeadId: 'proj-1', name: 'MVP', number: 1 },
      { beadStore, artifactStore, gitOps },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.milestone.name).toBe('MVP');
      expect(result.data.milestone.number).toBe(1);
      expect(gitOps.hasBranch('milestone/M01')).toBe(true);
    }
  });

  it('should create REQUIREMENTS.md stub', async () => {
    await createMilestoneUseCase(
      { projectBeadId: 'proj-1', name: 'MVP', number: 1 },
      { beadStore, artifactStore, gitOps },
    );

    expect(await artifactStore.exists('.tff/REQUIREMENTS.md')).toBe(true);
  });
});
```

Create `tools/src/application/milestone/list-milestones.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { listMilestones } from './list-milestones.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { isOk } from '../../domain/result.js';

describe('listMilestones', () => {
  let beadStore: InMemoryBeadStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
  });

  it('should return all milestones', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'closed' },
      { id: 'ms2', label: 'tff:milestone', title: 'v2', status: 'open' },
    ]);

    const result = await listMilestones({ beadStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return empty array when no milestones', async () => {
    const result = await listMilestones({ beadStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2: Implement services**

Create `tools/src/application/milestone/create-milestone.ts`:

```typescript
import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { createMilestone, formatMilestoneNumber, type Milestone } from '../../domain/entities/milestone.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

interface CreateMilestoneInput {
  projectBeadId: string;
  name: string;
  number: number;
}

interface CreateMilestoneDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
  gitOps: GitOps;
}

interface CreateMilestoneOutput {
  milestone: Milestone;
  beadId: string;
  branchName: string;
}

export const createMilestoneUseCase = async (
  input: CreateMilestoneInput,
  deps: CreateMilestoneDeps,
): Promise<Result<CreateMilestoneOutput, DomainError>> => {
  const milestone = createMilestone({
    projectId: input.projectBeadId,
    name: input.name,
    number: input.number,
  });

  const branchName = `milestone/${formatMilestoneNumber(input.number)}`;

  // Create bead
  const beadResult = await deps.beadStore.create({
    label: 'tff:milestone',
    title: input.name,
    design: `Milestone ${formatMilestoneNumber(input.number)}: ${input.name}`,
    parentId: input.projectBeadId,
  });
  if (!isOk(beadResult)) return beadResult;

  // Create branch
  await deps.gitOps.createBranch(branchName, 'main');

  // Create REQUIREMENTS.md if it doesn't exist
  if (!(await deps.artifactStore.exists('.tff/REQUIREMENTS.md'))) {
    await deps.artifactStore.write(
      '.tff/REQUIREMENTS.md',
      `# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
    );
  }

  return Ok({
    milestone,
    beadId: beadResult.data.id,
    branchName,
  });
};
```

Create `tools/src/application/milestone/list-milestones.ts`:

```typescript
import { type Result, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';

interface ListMilestonesDeps {
  beadStore: BeadStore;
}

export const listMilestones = async (
  deps: ListMilestonesDeps,
): Promise<Result<BeadData[], DomainError>> => {
  return deps.beadStore.list({ label: 'tff:milestone' });
};
```

- [ ] **Step 3: Create CLI commands**

Create `tools/src/cli/commands/milestone-create.cmd.ts`:

```typescript
import { createMilestoneUseCase } from '../../application/milestone/create-milestone.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const number = parseInt(args[1] ?? '1', 10);
  const projectBeadId = args[2] ?? '';

  if (!name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: milestone:create <name> [number] [project-bead-id]' } });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const gitOps = new GitCliAdapter(process.cwd());

  const result = await createMilestoneUseCase(
    { projectBeadId, name, number },
    { beadStore, artifactStore, gitOps },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/milestone-list.cmd.ts`:

```typescript
import { listMilestones } from '../../application/milestone/list-milestones.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const milestoneListCmd = async (_args: string[]): Promise<string> => {
  const beadStore = new BdCliAdapter();
  const result = await listMilestones({ beadStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 4: Run tests, type check**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/milestone/ tools/src/cli/commands/milestone-create.cmd.ts tools/src/cli/commands/milestone-list.cmd.ts
git commit -m "feat: add createMilestone, listMilestones services and CLI commands"
```

---

### Task 3: CreateSlice Service + CLI

**Files:**
- Create: `tools/src/application/slice/create-slice.ts`
- Create: `tools/src/application/slice/create-slice.spec.ts`
- Create: `tools/src/cli/commands/slice-create.cmd.ts`
- Create: `tools/src/cli/commands/slice-transition.cmd.ts`

- [ ] **Step 1: Write failing test**

Create `tools/src/application/slice/create-slice.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createSliceUseCase } from './create-slice.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk } from '../../domain/result.js';

describe('createSliceUseCase', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a slice with bead and markdown', async () => {
    const result = await createSliceUseCase(
      { milestoneBeadId: 'ms-1', name: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.slice.name).toBe('Auth');
      expect(result.data.slice.sliceId).toBe('M01-S01');
      expect(result.data.slice.status).toBe('discussing');
    }
  });

  it('should create slice directory', async () => {
    await createSliceUseCase(
      { milestoneBeadId: 'ms-1', name: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
      { beadStore, artifactStore },
    );

    expect(await artifactStore.exists('.tff/slices/M01-S01/PLAN.md')).toBe(true);
  });
});
```

- [ ] **Step 2: Implement createSliceUseCase**

Create `tools/src/application/slice/create-slice.ts`:

```typescript
import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { createSlice, type Slice } from '../../domain/entities/slice.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface CreateSliceInput {
  milestoneBeadId: string;
  name: string;
  milestoneNumber: number;
  sliceNumber: number;
}

interface CreateSliceDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

interface CreateSliceOutput {
  slice: Slice;
  beadId: string;
}

export const createSliceUseCase = async (
  input: CreateSliceInput,
  deps: CreateSliceDeps,
): Promise<Result<CreateSliceOutput, DomainError>> => {
  const slice = createSlice({
    milestoneId: input.milestoneBeadId,
    name: input.name,
    milestoneNumber: input.milestoneNumber,
    sliceNumber: input.sliceNumber,
  });

  const beadResult = await deps.beadStore.create({
    label: 'tff:slice',
    title: input.name,
    design: `Slice ${slice.sliceId}: ${input.name}`,
    parentId: input.milestoneBeadId,
  });
  if (!isOk(beadResult)) return beadResult;

  // Create slice directory with stub PLAN.md
  const sliceDir = `.tff/slices/${slice.sliceId}`;
  await deps.artifactStore.mkdir(sliceDir);
  await deps.artifactStore.write(
    `${sliceDir}/PLAN.md`,
    `# Plan — ${slice.sliceId}: ${input.name}\n\n_Plan will be defined during /tff:plan._\n`,
  );

  return Ok({ slice, beadId: beadResult.data.id });
};
```

- [ ] **Step 3: Create CLI commands**

Create `tools/src/cli/commands/slice-create.cmd.ts`:

```typescript
import { createSliceUseCase } from '../../application/slice/create-slice.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const sliceCreateCmd = async (args: string[]): Promise<string> => {
  const [milestoneBeadId, name, msNum, slNum] = args;
  if (!milestoneBeadId || !name) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:create <milestone-bead-id> <name> [milestone-number] [slice-number]' } });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await createSliceUseCase(
    { milestoneBeadId, name, milestoneNumber: parseInt(msNum ?? '1', 10), sliceNumber: parseInt(slNum ?? '1', 10) },
    { beadStore, artifactStore },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/slice-transition.cmd.ts`:

```typescript
import { transitionSliceUseCase } from '../../application/lifecycle/transition-slice.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { createSlice } from '../../domain/entities/slice.js';
import { type SliceStatus, SliceStatusSchema } from '../../domain/value-objects/slice-status.js';
import { isOk } from '../../domain/result.js';

export const sliceTransitionCmd = async (args: string[]): Promise<string> => {
  const [beadId, targetStatus, currentStatus, sliceId] = args;
  if (!beadId || !targetStatus) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: slice:transition <bead-id> <target-status> [current-status] [slice-id]' } });
  }

  try {
    SliceStatusSchema.parse(targetStatus);
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: `Invalid status: ${targetStatus}` } });
  }

  // Build a minimal slice object from the args
  const slice = {
    id: crypto.randomUUID(),
    milestoneId: crypto.randomUUID(),
    name: 'slice',
    sliceId: sliceId ?? 'unknown',
    status: (currentStatus ?? 'discussing') as SliceStatus,
    createdAt: new Date(),
  };

  const beadStore = new BdCliAdapter();
  const result = await transitionSliceUseCase(
    { slice, beadId, targetStatus: targetStatus as SliceStatus },
    { beadStore },
  );

  if (isOk(result)) return JSON.stringify({ ok: true, data: { status: result.data.slice.status } });
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 4: Run tests, type check**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/slice/ tools/src/cli/commands/slice-create.cmd.ts tools/src/cli/commands/slice-transition.cmd.ts
git commit -m "feat: add createSlice service and slice:create, slice:transition CLI commands"
```

---

### Task 4: Worktree Services + CLI

**Files:**
- Create: `tools/src/application/worktree/create-worktree.ts`
- Create: `tools/src/application/worktree/create-worktree.spec.ts`
- Create: `tools/src/application/worktree/delete-worktree.ts`
- Create: `tools/src/application/worktree/delete-worktree.spec.ts`
- Create: `tools/src/application/worktree/list-worktrees.ts`
- Create: `tools/src/application/worktree/list-worktrees.spec.ts`
- Create: `tools/src/cli/commands/worktree-create.cmd.ts`
- Create: `tools/src/cli/commands/worktree-delete.cmd.ts`
- Create: `tools/src/cli/commands/worktree-list.cmd.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/worktree/create-worktree.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorktreeUseCase } from './create-worktree.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { isOk } from '../../domain/result.js';

describe('createWorktreeUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => { gitOps = new InMemoryGitOps(); });

  it('should create a worktree with correct path and branch', async () => {
    const result = await createWorktreeUseCase(
      { sliceId: 'M01-S01' },
      { gitOps },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.worktreePath).toBe('.tff/worktrees/M01-S01');
      expect(result.data.branchName).toBe('slice/M01-S01');
      expect(gitOps.hasBranch('slice/M01-S01')).toBe(true);
    }
  });
});
```

Create `tools/src/application/worktree/delete-worktree.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { deleteWorktreeUseCase } from './delete-worktree.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { isOk, isErr } from '../../domain/result.js';

describe('deleteWorktreeUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => {
    gitOps = new InMemoryGitOps();
  });

  it('should delete an existing worktree', async () => {
    await gitOps.createWorktree('.tff/worktrees/M01-S01', 'slice/M01-S01');
    const result = await deleteWorktreeUseCase({ sliceId: 'M01-S01' }, { gitOps });
    expect(isOk(result)).toBe(true);
  });

  it('should return error for non-existent worktree', async () => {
    const result = await deleteWorktreeUseCase({ sliceId: 'M01-S99' }, { gitOps });
    expect(isErr(result)).toBe(true);
  });
});
```

Create `tools/src/application/worktree/list-worktrees.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { listWorktreesUseCase } from './list-worktrees.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { isOk } from '../../domain/result.js';

describe('listWorktreesUseCase', () => {
  let gitOps: InMemoryGitOps;
  beforeEach(() => { gitOps = new InMemoryGitOps(); });

  it('should list all worktrees', async () => {
    await gitOps.createWorktree('.tff/worktrees/M01-S01', 'slice/M01-S01');
    await gitOps.createWorktree('.tff/worktrees/M01-S02', 'slice/M01-S02');

    const result = await listWorktreesUseCase({ gitOps });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });
});
```

- [ ] **Step 2: Implement services**

Create `tools/src/application/worktree/create-worktree.ts`:

```typescript
import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

interface CreateWorktreeInput { sliceId: string; }
interface CreateWorktreeDeps { gitOps: GitOps; }
interface CreateWorktreeOutput { worktreePath: string; branchName: string; }

export const createWorktreeUseCase = async (
  input: CreateWorktreeInput,
  deps: CreateWorktreeDeps,
): Promise<Result<CreateWorktreeOutput, DomainError>> => {
  const worktreePath = `.tff/worktrees/${input.sliceId}`;
  const branchName = `slice/${input.sliceId}`;

  const result = await deps.gitOps.createWorktree(worktreePath, branchName);
  if (!isOk(result)) return result;

  return Ok({ worktreePath, branchName });
};
```

Create `tools/src/application/worktree/delete-worktree.ts`:

```typescript
import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

interface DeleteWorktreeInput { sliceId: string; }
interface DeleteWorktreeDeps { gitOps: GitOps; }

export const deleteWorktreeUseCase = async (
  input: DeleteWorktreeInput,
  deps: DeleteWorktreeDeps,
): Promise<Result<void, DomainError>> => {
  const worktreePath = `.tff/worktrees/${input.sliceId}`;
  return deps.gitOps.deleteWorktree(worktreePath);
};
```

Create `tools/src/application/worktree/list-worktrees.ts`:

```typescript
import { type Result } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type GitOps } from '../../domain/ports/git-ops.port.js';

interface ListWorktreesDeps { gitOps: GitOps; }

export const listWorktreesUseCase = async (
  deps: ListWorktreesDeps,
): Promise<Result<string[], DomainError>> => {
  return deps.gitOps.listWorktrees();
};
```

- [ ] **Step 3: Create CLI commands**

Create `tools/src/cli/commands/worktree-create.cmd.ts`:

```typescript
import { createWorktreeUseCase } from '../../application/worktree/create-worktree.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeCreateCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: worktree:create <slice-id>' } });
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await createWorktreeUseCase({ sliceId }, { gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/worktree-delete.cmd.ts`:

```typescript
import { deleteWorktreeUseCase } from '../../application/worktree/delete-worktree.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeDeleteCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: worktree:delete <slice-id>' } });
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await deleteWorktreeUseCase({ sliceId }, { gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/worktree-list.cmd.ts`:

```typescript
import { listWorktreesUseCase } from '../../application/worktree/list-worktrees.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { isOk } from '../../domain/result.js';

export const worktreeListCmd = async (_args: string[]): Promise<string> => {
  const gitOps = new GitCliAdapter(process.cwd());
  const result = await listWorktreesUseCase({ gitOps });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 4: Run tests, type check**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/worktree/ tools/src/cli/commands/worktree-create.cmd.ts tools/src/cli/commands/worktree-delete.cmd.ts tools/src/cli/commands/worktree-list.cmd.ts
git commit -m "feat: add worktree create/delete/list services and CLI commands"
```

---

### Task 5: RecordReview Service + Remaining Thin CLI Commands

**Files:**
- Create: `tools/src/application/review/record-review.ts`
- Create: `tools/src/application/review/record-review.spec.ts`
- Create: `tools/src/cli/commands/review-record.cmd.ts`
- Create: `tools/src/cli/commands/sync-state.cmd.ts`
- Create: `tools/src/cli/commands/sync-reconcile.cmd.ts`
- Create: `tools/src/cli/commands/checkpoint-save.cmd.ts`
- Create: `tools/src/cli/commands/checkpoint-load.cmd.ts`

- [ ] **Step 1: Write failing test for recordReview**

Create `tools/src/application/review/record-review.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { recordReviewUseCase } from './record-review.js';
import { InMemoryReviewStore } from '../../infrastructure/testing/in-memory-review-store.js';
import { isOk } from '../../domain/result.js';

describe('recordReviewUseCase', () => {
  let reviewStore: InMemoryReviewStore;
  beforeEach(() => { reviewStore = new InMemoryReviewStore(); });

  it('should record a review', async () => {
    const result = await recordReviewUseCase(
      { sliceId: 'M01-S01', reviewerAgent: 'code-reviewer', status: 'approved' },
      { reviewStore },
    );

    expect(isOk(result)).toBe(true);

    const reviews = await reviewStore.getReviewsForSlice('M01-S01');
    expect(isOk(reviews) && reviews.data.length).toBe(1);
  });
});
```

- [ ] **Step 2: Implement recordReview**

Create `tools/src/application/review/record-review.ts`:

```typescript
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type ReviewStore } from '../../domain/ports/review-store.port.js';

interface RecordReviewInput {
  sliceId: string;
  reviewerAgent: string;
  status: 'approved' | 'changes_requested';
}

interface RecordReviewDeps { reviewStore: ReviewStore; }

export const recordReviewUseCase = async (
  input: RecordReviewInput,
  deps: RecordReviewDeps,
): Promise<Result<void, DomainError>> => {
  return deps.reviewStore.record({
    sliceId: input.sliceId,
    reviewerAgent: input.reviewerAgent,
    status: input.status,
    reviewedAt: new Date(),
  });
};
```

- [ ] **Step 3: Create remaining CLI commands**

Create `tools/src/cli/commands/review-record.cmd.ts`:

```typescript
import { recordReviewUseCase } from '../../application/review/record-review.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { ReviewMetadataAdapter } from '../../infrastructure/adapters/review/review-metadata.adapter.js';
import { isOk } from '../../domain/result.js';

export const reviewRecordCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent, status] = args;
  if (!sliceId || !agent || !status) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: review:record <slice-id> <agent> <approved|changes_requested>' } });
  }
  const beadStore = new BdCliAdapter();
  const reviewStore = new ReviewMetadataAdapter(beadStore);
  const result = await recordReviewUseCase(
    { sliceId, reviewerAgent: agent, status: status as 'approved' | 'changes_requested' },
    { reviewStore },
  );
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/sync-state.cmd.ts`:

```typescript
import { generateState } from '../../application/sync/generate-state.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const syncStateCmd = async (args: string[]): Promise<string> => {
  const [milestoneId, milestoneName] = args;
  if (!milestoneId) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: sync:state <milestone-bead-id> [milestone-name]' } });
  }
  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await generateState(
    { milestoneId, milestoneName: milestoneName ?? 'Milestone' },
    { beadStore, artifactStore },
  );
  if (isOk(result)) return JSON.stringify({ ok: true, data: null });
  return JSON.stringify({ ok: false, error: result.error });
};
```

Create `tools/src/cli/commands/sync-reconcile.cmd.ts`:

```typescript
export const syncReconcileCmd = async (_args: string[]): Promise<string> => {
  // Reconciliation is complex — delegated to workflow-level orchestration
  // The workflow calls sync:state for the beads→md direction
  // Full bidirectional reconciliation is deferred to a future plan
  return JSON.stringify({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Full reconciliation not yet implemented. Use sync:state for beads→markdown sync.' },
  });
};
```

Create `tools/src/cli/commands/checkpoint-save.cmd.ts`:

```typescript
import { saveCheckpoint } from '../../application/checkpoint/save-checkpoint.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const checkpointSaveCmd = async (args: string[]): Promise<string> => {
  const [dataJson] = args;
  if (!dataJson) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: checkpoint:save <checkpoint-data-json>' } });
  }
  try {
    const data = JSON.parse(dataJson);
    const artifactStore = new MarkdownArtifactAdapter(process.cwd());
    const result = await saveCheckpoint(data, { artifactStore });
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON input' } });
  }
};
```

Create `tools/src/cli/commands/checkpoint-load.cmd.ts`:

```typescript
import { loadCheckpoint } from '../../application/checkpoint/load-checkpoint.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const checkpointLoadCmd = async (args: string[]): Promise<string> => {
  const [sliceId] = args;
  if (!sliceId) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: checkpoint:load <slice-id>' } });
  }
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());
  const result = await loadCheckpoint(sliceId, { artifactStore });
  if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 4: Run tests, type check**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/review/record-review.ts tools/src/application/review/record-review.spec.ts tools/src/cli/commands/review-record.cmd.ts tools/src/cli/commands/sync-state.cmd.ts tools/src/cli/commands/sync-reconcile.cmd.ts tools/src/cli/commands/checkpoint-save.cmd.ts tools/src/cli/commands/checkpoint-load.cmd.ts
git commit -m "feat: add recordReview service and remaining CLI commands (sync, checkpoint, review:record)"
```

---

### Task 6: Update CLI Router + Rebuild

**Files:**
- Modify: `tools/src/cli/index.ts`
- Modify: `tools/src/application/index.ts`

- [ ] **Step 1: Update CLI router with all commands**

Replace `tools/src/cli/index.ts`:

```typescript
import { projectInitCmd } from './commands/project-init.cmd.js';
import { projectGetCmd } from './commands/project-get.cmd.js';
import { milestoneCreateCmd } from './commands/milestone-create.cmd.js';
import { milestoneListCmd } from './commands/milestone-list.cmd.js';
import { sliceCreateCmd } from './commands/slice-create.cmd.js';
import { sliceTransitionCmd } from './commands/slice-transition.cmd.js';
import { sliceClassifyCmd } from './commands/slice-classify.cmd.js';
import { wavesDetectCmd } from './commands/waves-detect.cmd.js';
import { syncStateCmd } from './commands/sync-state.cmd.js';
import { syncReconcileCmd } from './commands/sync-reconcile.cmd.js';
import { worktreeCreateCmd } from './commands/worktree-create.cmd.js';
import { worktreeDeleteCmd } from './commands/worktree-delete.cmd.js';
import { worktreeListCmd } from './commands/worktree-list.cmd.js';
import { reviewRecordCmd } from './commands/review-record.cmd.js';
import { reviewCheckFreshCmd } from './commands/review-check-fresh.cmd.js';
import { checkpointSaveCmd } from './commands/checkpoint-save.cmd.js';
import { checkpointLoadCmd } from './commands/checkpoint-load.cmd.js';

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
  'project:init': projectInitCmd,
  'project:get': projectGetCmd,
  'milestone:create': milestoneCreateCmd,
  'milestone:list': milestoneListCmd,
  'slice:create': sliceCreateCmd,
  'slice:transition': sliceTransitionCmd,
  'slice:classify': sliceClassifyCmd,
  'waves:detect': wavesDetectCmd,
  'sync:state': syncStateCmd,
  'sync:reconcile': syncReconcileCmd,
  'worktree:create': worktreeCreateCmd,
  'worktree:delete': worktreeDeleteCmd,
  'worktree:list': worktreeListCmd,
  'review:record': reviewRecordCmd,
  'review:check-fresh': reviewCheckFreshCmd,
  'checkpoint:save': checkpointSaveCmd,
  'checkpoint:load': checkpointLoadCmd,
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    console.log(JSON.stringify({
      ok: true,
      data: { name: 'tff-tools', version: '0.1.0', commands: Object.keys(commands) },
    }));
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(JSON.stringify({
      ok: false,
      error: { code: 'UNKNOWN_COMMAND', message: `Unknown command "${command}". Run --help for available commands.` },
    }));
    return;
  }

  const output = await handler(args);
  console.log(output);
};

main().catch((err) => {
  console.log(JSON.stringify({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message: String(err) },
  }));
  process.exit(1);
});
```

- [ ] **Step 2: Update application barrel export**

Replace `tools/src/application/index.ts`:

```typescript
export { initProject } from './project/init-project.js';
export { getProject } from './project/get-project.js';
export { createMilestoneUseCase } from './milestone/create-milestone.js';
export { listMilestones } from './milestone/list-milestones.js';
export { createSliceUseCase } from './slice/create-slice.js';
export { classifyComplexity } from './lifecycle/classify-complexity.js';
export { transitionSliceUseCase } from './lifecycle/transition-slice.js';
export { detectWaves } from './waves/detect-waves.js';
export { enforceFreshReviewer } from './review/enforce-fresh-reviewer.js';
export { recordReviewUseCase } from './review/record-review.js';
export { generateState } from './sync/generate-state.js';
export { saveCheckpoint, type CheckpointData } from './checkpoint/save-checkpoint.js';
export { loadCheckpoint } from './checkpoint/load-checkpoint.js';
```

- [ ] **Step 3: Run full test suite**

```bash
cd tools && npx vitest run
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

- [ ] **Step 5: Rebuild**

```bash
npx tsup
```

- [ ] **Step 6: Verify all 17 commands work**

```bash
node tools/dist/tff-tools.cjs --help
node tools/dist/tff-tools.cjs slice:classify '{"taskCount":2,"estimatedFilesAffected":3,"modulesAffected":1,"hasExternalIntegrations":false,"unknownsSurfaced":0}'
node tools/dist/tff-tools.cjs waves:detect '[{"id":"t1","dependsOn":[]},{"id":"t2","dependsOn":["t1"]}]'
node tools/dist/tff-tools.cjs checkpoint:load M01-S01
node tools/dist/tff-tools.cjs unknown-command
```

- [ ] **Step 7: Commit**

```bash
git add tools/src/cli/index.ts tools/src/application/index.ts tools/dist/tff-tools.cjs
git commit -m "feat: wire all 17 CLI commands — no more NOT_IMPLEMENTED stubs"
```
