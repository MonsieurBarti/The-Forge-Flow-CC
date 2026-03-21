# Plan 2: Application Layer + Infrastructure Adapters + CLI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the application services that orchestrate domain entities through ports, the infrastructure adapters that implement those ports (beads CLI, git CLI, filesystem), and the CLI command router that wires everything together.

**Architecture:** Application layer depends only on domain (entities, ports, value objects). Infrastructure adapters implement ports by shelling out to `bd`, `git`, and `node:fs`. CLI entry point wires adapters to ports and dispatches to application services. All return `Result<T, E>`.

**Tech Stack:** TypeScript (strict), Zod, Vitest, Node.js 20+, `node:child_process` (for CLI adapters), `node:fs/promises` (for filesystem adapter)

**Spec:** `docs/superpowers/specs/2026-03-21-the-forge-flow-design.md`

**Depends on:** Plan 1 (domain foundation) — all domain types, entities, ports, and value objects.

**Zod version note:** Zod v4 is installed. Use `z.record(z.string(), z.unknown())` not `z.record(z.unknown())`. Use `z.number().int().nonnegative()` not `.nonneg()`.

---

## File Structure

```
tools/src/
  application/
    project/
      init-project.ts
      init-project.spec.ts
      get-project.ts
      get-project.spec.ts
    lifecycle/
      transition-slice.ts
      transition-slice.spec.ts
      classify-complexity.ts
      classify-complexity.spec.ts
    waves/
      detect-waves.ts
      detect-waves.spec.ts
    review/
      enforce-fresh-reviewer.ts
      enforce-fresh-reviewer.spec.ts
    sync/
      generate-state.ts
      generate-state.spec.ts
    checkpoint/
      save-checkpoint.ts
      save-checkpoint.spec.ts
      load-checkpoint.ts
      load-checkpoint.spec.ts

  infrastructure/
    adapters/
      beads/
        bd-cli.adapter.ts
        bd-cli.adapter.spec.ts
      filesystem/
        markdown-artifact.adapter.ts
        markdown-artifact.adapter.spec.ts
      git/
        git-cli.adapter.ts
        git-cli.adapter.spec.ts
        worktree.adapter.ts
        worktree.adapter.spec.ts
      review/
        review-metadata.adapter.ts
        review-metadata.adapter.spec.ts
    testing/
      in-memory-bead-store.ts
      in-memory-artifact-store.ts
      in-memory-git-ops.ts
      in-memory-review-store.ts

  cli/
    index.ts                    ← update existing
    commands/
      project-init.cmd.ts
      project-get.cmd.ts
      milestone-create.cmd.ts
      milestone-list.cmd.ts
      slice-create.cmd.ts
      slice-transition.cmd.ts
      slice-classify.cmd.ts
      waves-detect.cmd.ts
      sync-reconcile.cmd.ts
      sync-state.cmd.ts
      worktree-create.cmd.ts
      worktree-delete.cmd.ts
      worktree-list.cmd.ts
      review-record.cmd.ts
      review-check-fresh.cmd.ts
      checkpoint-save.cmd.ts
      checkpoint-load.cmd.ts
```

---

### Task 1: In-Memory Test Adapters

**Files:**
- Create: `tools/src/infrastructure/testing/in-memory-bead-store.ts`
- Create: `tools/src/infrastructure/testing/in-memory-artifact-store.ts`
- Create: `tools/src/infrastructure/testing/in-memory-git-ops.ts`
- Create: `tools/src/infrastructure/testing/in-memory-review-store.ts`

These adapters are used by all application layer tests. They implement the domain ports with simple in-memory maps — no I/O, no side effects.

- [ ] **Step 1: Create InMemoryBeadStore**

Create `tools/src/infrastructure/testing/in-memory-bead-store.ts`:

```typescript
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

export class InMemoryBeadStore implements BeadStore {
  private beads = new Map<string, BeadData>();
  private nextId = 1;

  async create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const id = `bead-${this.nextId++}`;
    const bead: BeadData = {
      id,
      label: input.label,
      title: input.title,
      status: 'open',
      design: input.design,
      parentId: input.parentId,
    };
    this.beads.set(id, bead);
    return Ok(bead);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) {
      return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    }
    return Ok(bead);
  }

  async list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
  }): Promise<Result<BeadData[], DomainError>> {
    let results = [...this.beads.values()];
    if (filter.label) results = results.filter((b) => b.label === filter.label);
    if (filter.parentId) results = results.filter((b) => b.parentId === filter.parentId);
    if (filter.status) results = results.filter((b) => b.status === filter.status);
    return Ok(results);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.status = status;
    return Ok(undefined);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.design = design;
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(id);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${id}" not found`, { id }));
    bead.metadata = { ...bead.metadata, [key]: value };
    return Ok(undefined);
  }

  async addDependency(
    fromId: string,
    toId: string,
    type: 'blocks' | 'validates',
  ): Promise<Result<void, DomainError>> {
    const bead = this.beads.get(fromId);
    if (!bead) return Err(createDomainError('PROJECT_EXISTS', `Bead "${fromId}" not found`, { id: fromId }));
    if (type === 'blocks') {
      bead.blocks = [...(bead.blocks ?? []), toId];
    } else {
      bead.validates = [...(bead.validates ?? []), toId];
    }
    return Ok(undefined);
  }

  async close(id: string): Promise<Result<void, DomainError>> {
    return this.updateStatus(id, 'closed');
  }

  // Test helpers
  reset(): void {
    this.beads.clear();
    this.nextId = 1;
  }

  seed(beads: BeadData[]): void {
    for (const bead of beads) {
      this.beads.set(bead.id, bead);
    }
  }
}
```

- [ ] **Step 2: Create InMemoryArtifactStore**

Create `tools/src/infrastructure/testing/in-memory-artifact-store.ts`:

```typescript
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

export class InMemoryArtifactStore implements ArtifactStore {
  private files = new Map<string, string>();

  async read(path: string): Promise<Result<string, DomainError>> {
    const content = this.files.get(path);
    if (content === undefined) {
      return Err(createDomainError('PROJECT_EXISTS', `File not found: ${path}`, { path }));
    }
    return Ok(content);
  }

  async write(path: string, content: string): Promise<Result<void, DomainError>> {
    this.files.set(path, content);
    return Ok(undefined);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async list(directory: string): Promise<Result<string[], DomainError>> {
    const prefix = directory.endsWith('/') ? directory : `${directory}/`;
    const matches = [...this.files.keys()].filter((k) => k.startsWith(prefix));
    return Ok(matches);
  }

  async mkdir(_path: string): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }

  // Test helpers
  reset(): void {
    this.files.clear();
  }

  seed(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.files.set(path, content);
    }
  }

  getAll(): Map<string, string> {
    return new Map(this.files);
  }
}
```

- [ ] **Step 3: Create InMemoryGitOps**

Create `tools/src/infrastructure/testing/in-memory-git-ops.ts`:

```typescript
import { type GitOps } from '../../domain/ports/git-ops.port.js';
import { type CommitRef } from '../../domain/value-objects/commit-ref.js';
import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

export class InMemoryGitOps implements GitOps {
  private branches = new Set<string>(['main']);
  private worktrees = new Map<string, string>();
  private currentBranch = 'main';
  private commits: CommitRef[] = [];
  private headSha = 'abc1234';

  async createBranch(name: string, _from: string): Promise<Result<void, DomainError>> {
    this.branches.add(name);
    return Ok(undefined);
  }

  async createWorktree(path: string, branch: string): Promise<Result<void, DomainError>> {
    this.worktrees.set(path, branch);
    this.branches.add(branch);
    return Ok(undefined);
  }

  async deleteWorktree(path: string): Promise<Result<void, DomainError>> {
    if (!this.worktrees.has(path)) {
      return Err(createDomainError('PROJECT_EXISTS', `Worktree not found: ${path}`, { path }));
    }
    this.worktrees.delete(path);
    return Ok(undefined);
  }

  async listWorktrees(): Promise<Result<string[], DomainError>> {
    return Ok([...this.worktrees.keys()]);
  }

  async commit(message: string, _files: string[], _worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const sha = Math.random().toString(16).slice(2, 9);
    const ref: CommitRef = { sha, message };
    this.commits.push(ref);
    this.headSha = sha;
    return Ok(ref);
  }

  async revert(commitSha: string, _worktreePath?: string): Promise<Result<CommitRef, DomainError>> {
    const sha = Math.random().toString(16).slice(2, 9);
    const ref: CommitRef = { sha, message: `Revert "${commitSha}"` };
    this.commits.push(ref);
    this.headSha = sha;
    return Ok(ref);
  }

  async merge(_source: string, _target: string): Promise<Result<void, DomainError>> {
    return Ok(undefined);
  }

  async getCurrentBranch(_worktreePath?: string): Promise<Result<string, DomainError>> {
    return Ok(this.currentBranch);
  }

  async getHeadSha(_worktreePath?: string): Promise<Result<string, DomainError>> {
    return Ok(this.headSha);
  }

  // Test helpers
  reset(): void {
    this.branches = new Set(['main']);
    this.worktrees.clear();
    this.currentBranch = 'main';
    this.commits = [];
    this.headSha = 'abc1234';
  }

  getCommits(): CommitRef[] {
    return [...this.commits];
  }

  hasBranch(name: string): boolean {
    return this.branches.has(name);
  }
}
```

- [ ] **Step 4: Create InMemoryReviewStore**

Create `tools/src/infrastructure/testing/in-memory-review-store.ts`:

```typescript
import { type ReviewStore, type ReviewRecord } from '../../domain/ports/review-store.port.js';
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';

export class InMemoryReviewStore implements ReviewStore {
  private reviews: ReviewRecord[] = [];
  private executors = new Map<string, string[]>();

  async record(review: ReviewRecord): Promise<Result<void, DomainError>> {
    this.reviews.push(review);
    return Ok(undefined);
  }

  async getExecutorsForSlice(sliceId: string): Promise<Result<string[], DomainError>> {
    return Ok(this.executors.get(sliceId) ?? []);
  }

  async getReviewsForSlice(sliceId: string): Promise<Result<ReviewRecord[], DomainError>> {
    return Ok(this.reviews.filter((r) => r.sliceId === sliceId));
  }

  // Test helpers
  reset(): void {
    this.reviews = [];
    this.executors.clear();
  }

  seedExecutors(sliceId: string, agents: string[]): void {
    this.executors.set(sliceId, agents);
  }
}
```

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

- [ ] **Step 6: Commit**

```bash
git add tools/src/infrastructure/testing/
git commit -m "feat: add in-memory test adapters for all domain ports"
```

---

### Task 2: Application Service — InitProject

**Files:**
- Create: `tools/src/application/project/init-project.ts`
- Create: `tools/src/application/project/init-project.spec.ts`

This service enforces the singleton project constraint: one tff project per repo.

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/project/init-project.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initProject } from './init-project.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('initProject', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a project when none exists', async () => {
    const result = await initProject(
      { name: 'my-app', vision: 'A great app' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.project.name).toBe('my-app');
      expect(result.data.project.vision).toBe('A great app');
    }
  });

  it('should create PROJECT.md artifact', async () => {
    await initProject(
      { name: 'my-app', vision: 'A great app' },
      { beadStore, artifactStore },
    );

    expect(await artifactStore.exists('.tff/PROJECT.md')).toBe(true);
  });

  it('should create a tff:project bead', async () => {
    await initProject(
      { name: 'my-app', vision: 'A great app' },
      { beadStore, artifactStore },
    );

    const beads = await beadStore.list({ label: 'tff:project' });
    expect(isOk(beads) && beads.data.length).toBe(1);
  });

  it('should reject if project bead already exists', async () => {
    await initProject(
      { name: 'my-app', vision: 'A great app' },
      { beadStore, artifactStore },
    );

    const result = await initProject(
      { name: 'another', vision: 'Nope' },
      { beadStore, artifactStore },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PROJECT_EXISTS');
    }
  });

  it('should reject if PROJECT.md already exists', async () => {
    artifactStore.seed({ '.tff/PROJECT.md': '# Existing' });

    const result = await initProject(
      { name: 'my-app', vision: 'Vision' },
      { beadStore, artifactStore },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('PROJECT_EXISTS');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC/tools && npx vitest run src/application/project/init-project.spec.ts
```

- [ ] **Step 3: Implement initProject**

Create `tools/src/application/project/init-project.ts`:

```typescript
import { type Result, Ok, Err, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { projectExistsError } from '../../domain/errors/project-exists.error.js';
import { createProject, type Project } from '../../domain/entities/project.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface InitProjectInput {
  name: string;
  vision: string;
}

interface InitProjectDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

interface InitProjectOutput {
  project: Project;
  beadId: string;
}

export const initProject = async (
  input: InitProjectInput,
  deps: InitProjectDeps,
): Promise<Result<InitProjectOutput, DomainError>> => {
  // Check if PROJECT.md already exists
  if (await deps.artifactStore.exists('.tff/PROJECT.md')) {
    return Err(projectExistsError(input.name));
  }

  // Check if a tff:project bead already exists
  const existing = await deps.beadStore.list({ label: 'tff:project' });
  if (isOk(existing) && existing.data.length > 0) {
    return Err(projectExistsError(input.name));
  }

  // Create project entity
  const project = createProject(input);

  // Create bead
  const beadResult = await deps.beadStore.create({
    label: 'tff:project',
    title: project.name,
    design: project.vision,
  });

  if (!isOk(beadResult)) {
    return beadResult;
  }

  // Create directory structure and PROJECT.md
  await deps.artifactStore.mkdir('.tff');
  await deps.artifactStore.mkdir('.tff/slices');

  const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
  await deps.artifactStore.write('.tff/PROJECT.md', projectMd);

  return Ok({ project, beadId: beadResult.data.id });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC/tools && npx vitest run src/application/project/init-project.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/project/
git commit -m "feat: add initProject application service with singleton enforcement"
```

---

### Task 3: Application Service — ClassifyComplexity

**Files:**
- Create: `tools/src/application/lifecycle/classify-complexity.ts`
- Create: `tools/src/application/lifecycle/classify-complexity.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/lifecycle/classify-complexity.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { classifyComplexity } from './classify-complexity.js';

describe('classifyComplexity', () => {
  it('should classify as S when few tasks and single module', () => {
    const tier = classifyComplexity({
      taskCount: 2,
      estimatedFilesAffected: 3,
      modulesAffected: 1,
      hasExternalIntegrations: false,
      unknownsSurfaced: 0,
    });
    expect(tier).toBe('S');
  });

  it('should classify as F-lite for moderate scope', () => {
    const tier = classifyComplexity({
      taskCount: 5,
      estimatedFilesAffected: 8,
      modulesAffected: 2,
      hasExternalIntegrations: false,
      unknownsSurfaced: 1,
    });
    expect(tier).toBe('F-lite');
  });

  it('should classify as F-full for complex scope', () => {
    const tier = classifyComplexity({
      taskCount: 12,
      estimatedFilesAffected: 20,
      modulesAffected: 4,
      hasExternalIntegrations: true,
      unknownsSurfaced: 3,
    });
    expect(tier).toBe('F-full');
  });

  it('should classify as F-full when external integrations present regardless of size', () => {
    const tier = classifyComplexity({
      taskCount: 3,
      estimatedFilesAffected: 5,
      modulesAffected: 2,
      hasExternalIntegrations: true,
      unknownsSurfaced: 0,
    });
    expect(tier).toBe('F-full');
  });

  it('should classify as F-lite when many unknowns even with few tasks', () => {
    const tier = classifyComplexity({
      taskCount: 2,
      estimatedFilesAffected: 3,
      modulesAffected: 1,
      hasExternalIntegrations: false,
      unknownsSurfaced: 3,
    });
    expect(tier).toBe('F-lite');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement classifyComplexity**

Create `tools/src/application/lifecycle/classify-complexity.ts`:

```typescript
import { type ComplexityTier } from '../../domain/value-objects/complexity-tier.js';

interface ComplexitySignals {
  taskCount: number;
  estimatedFilesAffected: number;
  modulesAffected: number;
  hasExternalIntegrations: boolean;
  unknownsSurfaced: number;
}

export const classifyComplexity = (signals: ComplexitySignals): ComplexityTier => {
  // F-full: external integrations always bump to full
  if (signals.hasExternalIntegrations) return 'F-full';

  // F-full: high task count or many modules
  if (signals.taskCount >= 8 || signals.modulesAffected >= 4) return 'F-full';

  // F-lite: moderate scope or significant unknowns
  if (
    signals.taskCount >= 4 ||
    signals.modulesAffected >= 2 ||
    signals.estimatedFilesAffected >= 6 ||
    signals.unknownsSurfaced >= 2
  ) {
    return 'F-lite';
  }

  // S: everything else
  return 'S';
};
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/lifecycle/
git commit -m "feat: add classifyComplexity heuristic for S/F-lite/F-full tiers"
```

---

### Task 4: Application Service — TransitionSlice

**Files:**
- Create: `tools/src/application/lifecycle/transition-slice.ts`
- Create: `tools/src/application/lifecycle/transition-slice.spec.ts`

This wraps the domain's `transitionSlice` with bead status updates.

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/lifecycle/transition-slice.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { transitionSliceUseCase } from './transition-slice.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { isOk, isErr } from '../../domain/result.js';
import { createSlice } from '../../domain/entities/slice.js';

describe('transitionSliceUseCase', () => {
  let beadStore: InMemoryBeadStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
  });

  it('should transition slice and update bead status', async () => {
    const slice = createSlice({
      milestoneId: crypto.randomUUID(),
      name: 'Auth',
      milestoneNumber: 1,
      sliceNumber: 1,
    });

    beadStore.seed([{
      id: 'bead-1',
      label: 'tff:slice',
      title: 'Auth',
      status: 'discussing',
    }]);

    const result = await transitionSliceUseCase(
      { slice, beadId: 'bead-1', targetStatus: 'researching' },
      { beadStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.slice.status).toBe('researching');
      expect(result.data.events).toHaveLength(1);
    }
  });

  it('should reject invalid transition', async () => {
    const slice = createSlice({
      milestoneId: crypto.randomUUID(),
      name: 'Auth',
      milestoneNumber: 1,
      sliceNumber: 1,
    });

    const result = await transitionSliceUseCase(
      { slice, beadId: 'bead-1', targetStatus: 'executing' },
      { beadStore },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_TRANSITION');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement transitionSliceUseCase**

Create `tools/src/application/lifecycle/transition-slice.ts`:

```typescript
import { type Result, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type Slice, transitionSlice } from '../../domain/entities/slice.js';
import { type SliceStatus } from '../../domain/value-objects/slice-status.js';
import { type DomainEvent } from '../../domain/events/domain-event.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';

interface TransitionInput {
  slice: Slice;
  beadId: string;
  targetStatus: SliceStatus;
}

interface TransitionDeps {
  beadStore: BeadStore;
}

interface TransitionOutput {
  slice: Slice;
  events: DomainEvent[];
}

export const transitionSliceUseCase = async (
  input: TransitionInput,
  deps: TransitionDeps,
): Promise<Result<TransitionOutput, DomainError>> => {
  const result = transitionSlice(input.slice, input.targetStatus);

  if (!isOk(result)) return result;

  // Persist status change to beads
  await deps.beadStore.updateStatus(input.beadId, input.targetStatus);

  return result;
};
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/lifecycle/transition-slice.ts tools/src/application/lifecycle/transition-slice.spec.ts
git commit -m "feat: add transitionSlice use case with bead status sync"
```

---

### Task 5: Application Service — DetectWaves

**Files:**
- Create: `tools/src/application/waves/detect-waves.ts`
- Create: `tools/src/application/waves/detect-waves.spec.ts`

Topological sort of tasks into execution waves based on dependency graph.

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/waves/detect-waves.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectWaves } from './detect-waves.js';
import { isOk, isErr } from '../../domain/result.js';

describe('detectWaves', () => {
  it('should put independent tasks in wave 0', () => {
    const result = detectWaves([
      { id: 't1', dependsOn: [] },
      { id: 't2', dependsOn: [] },
      { id: 't3', dependsOn: [] },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].index).toBe(0);
      expect(result.data[0].taskIds).toEqual(['t1', 't2', 't3']);
    }
  });

  it('should create sequential waves for linear dependencies', () => {
    const result = detectWaves([
      { id: 't1', dependsOn: [] },
      { id: 't2', dependsOn: ['t1'] },
      { id: 't3', dependsOn: ['t2'] },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].taskIds).toEqual(['t1']);
      expect(result.data[1].taskIds).toEqual(['t2']);
      expect(result.data[2].taskIds).toEqual(['t3']);
    }
  });

  it('should group parallel tasks with same dependencies', () => {
    const result = detectWaves([
      { id: 't1', dependsOn: [] },
      { id: 't2', dependsOn: ['t1'] },
      { id: 't3', dependsOn: ['t1'] },
      { id: 't4', dependsOn: ['t2', 't3'] },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].taskIds).toEqual(['t1']);
      expect(result.data[1].taskIds).toContain('t2');
      expect(result.data[1].taskIds).toContain('t3');
      expect(result.data[2].taskIds).toEqual(['t4']);
    }
  });

  it('should detect circular dependencies', () => {
    const result = detectWaves([
      { id: 't1', dependsOn: ['t2'] },
      { id: 't2', dependsOn: ['t1'] },
    ]);

    expect(isErr(result)).toBe(true);
  });

  it('should handle empty input', () => {
    const result = detectWaves([]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement detectWaves**

Create `tools/src/application/waves/detect-waves.ts`:

```typescript
import { type Result, Ok, Err } from '../../domain/result.js';
import { type Wave } from '../../domain/value-objects/wave.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

interface TaskDep {
  id: string;
  dependsOn: string[];
}

export const detectWaves = (tasks: TaskDep[]): Result<Wave[], DomainError> => {
  if (tasks.length === 0) return Ok([]);

  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, 0);
    dependents.set(task.id, []);
  }

  // Build graph
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      const deps = dependents.get(dep) ?? [];
      deps.push(task.id);
      dependents.set(dep, deps);
    }
  }

  const waves: Wave[] = [];
  let remaining = tasks.length;

  // BFS by levels
  let currentWave = [...inDegree.entries()]
    .filter(([_, deg]) => deg === 0)
    .map(([id]) => id)
    .sort();

  let waveIndex = 0;

  while (currentWave.length > 0) {
    waves.push({ index: waveIndex, taskIds: currentWave });
    remaining -= currentWave.length;

    const nextWave: string[] = [];
    for (const taskId of currentWave) {
      for (const dependent of dependents.get(taskId) ?? []) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) {
          nextWave.push(dependent);
        }
      }
    }

    currentWave = nextWave.sort();
    waveIndex++;
  }

  if (remaining > 0) {
    return Err(
      createDomainError(
        'INVALID_TRANSITION',
        'Circular dependency detected in task graph',
        { remaining },
      ),
    );
  }

  return Ok(waves);
};
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/waves/
git commit -m "feat: add detectWaves topological sort for wave-based parallelism"
```

---

### Task 6: Application Service — EnforceFreshReviewer

**Files:**
- Create: `tools/src/application/review/enforce-fresh-reviewer.ts`
- Create: `tools/src/application/review/enforce-fresh-reviewer.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/review/enforce-fresh-reviewer.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { enforceFreshReviewer } from './enforce-fresh-reviewer.js';
import { InMemoryReviewStore } from '../../infrastructure/testing/in-memory-review-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('enforceFreshReviewer', () => {
  let reviewStore: InMemoryReviewStore;

  beforeEach(() => {
    reviewStore = new InMemoryReviewStore();
  });

  it('should allow review when reviewer was not an executor', async () => {
    reviewStore.seedExecutors('M01-S01', ['backend-dev']);

    const result = await enforceFreshReviewer(
      { sliceId: 'M01-S01', reviewerAgent: 'code-reviewer' },
      { reviewStore },
    );

    expect(isOk(result)).toBe(true);
  });

  it('should block review when reviewer was an executor', async () => {
    reviewStore.seedExecutors('M01-S01', ['backend-dev', 'frontend-dev']);

    const result = await enforceFreshReviewer(
      { sliceId: 'M01-S01', reviewerAgent: 'backend-dev' },
      { reviewStore },
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('FRESH_REVIEWER_VIOLATION');
    }
  });

  it('should allow review when no executors recorded', async () => {
    const result = await enforceFreshReviewer(
      { sliceId: 'M01-S01', reviewerAgent: 'code-reviewer' },
      { reviewStore },
    );

    expect(isOk(result)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement enforceFreshReviewer**

Create `tools/src/application/review/enforce-fresh-reviewer.ts`:

```typescript
import { type Result, Ok, Err, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { freshReviewerViolationError } from '../../domain/errors/fresh-reviewer-violation.error.js';
import { type ReviewStore } from '../../domain/ports/review-store.port.js';

interface EnforceFreshReviewerInput {
  sliceId: string;
  reviewerAgent: string;
}

interface EnforceFreshReviewerDeps {
  reviewStore: ReviewStore;
}

export const enforceFreshReviewer = async (
  input: EnforceFreshReviewerInput,
  deps: EnforceFreshReviewerDeps,
): Promise<Result<void, DomainError>> => {
  const executorsResult = await deps.reviewStore.getExecutorsForSlice(input.sliceId);

  if (!isOk(executorsResult)) return executorsResult;

  const executors = executorsResult.data;

  if (executors.includes(input.reviewerAgent)) {
    return Err(freshReviewerViolationError(input.sliceId, input.reviewerAgent));
  }

  return Ok(undefined);
};
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/review/
git commit -m "feat: add enforceFreshReviewer use case"
```

---

### Task 7: Application Service — GenerateState

**Files:**
- Create: `tools/src/application/sync/generate-state.ts`
- Create: `tools/src/application/sync/generate-state.spec.ts`

Generates STATE.md from bead data. STATE.md is always derived, never hand-edited.

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/sync/generate-state.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { generateState } from './generate-state.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk } from '../../domain/result.js';

describe('generateState', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should generate STATE.md with slice progress', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'in_progress' },
      { id: 's1', label: 'tff:slice', title: 'Auth', status: 'closed', parentId: 'ms1' },
      { id: 's2', label: 'tff:slice', title: 'Billing', status: 'executing', parentId: 'ms1' },
      { id: 't1', label: 'tff:task', title: 'Login', status: 'closed', parentId: 's1' },
      { id: 't2', label: 'tff:task', title: 'Signup', status: 'closed', parentId: 's1' },
      { id: 't3', label: 'tff:task', title: 'Payment', status: 'in_progress', parentId: 's2' },
      { id: 't4', label: 'tff:task', title: 'Invoice', status: 'open', parentId: 's2' },
    ]);

    const result = await generateState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);

    const content = await artifactStore.read('.tff/STATE.md');
    expect(isOk(content)).toBe(true);
    if (isOk(content)) {
      expect(content.data).toContain('# State — MVP');
      expect(content.data).toContain('Auth');
      expect(content.data).toContain('Billing');
      expect(content.data).toContain('closed');
      expect(content.data).toContain('executing');
    }
  });

  it('should handle empty milestone', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
    ]);

    const result = await generateState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement generateState**

Create `tools/src/application/sync/generate-state.ts`:

```typescript
import { type Result, Ok, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type BeadStore, type BeadData } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface GenerateStateInput {
  milestoneId: string;
  milestoneName: string;
}

interface GenerateStateDeps {
  beadStore: BeadStore;
  artifactStore: ArtifactStore;
}

export const generateState = async (
  input: GenerateStateInput,
  deps: GenerateStateDeps,
): Promise<Result<void, DomainError>> => {
  // Load slices for this milestone
  const slicesResult = await deps.beadStore.list({
    label: 'tff:slice',
    parentId: input.milestoneId,
  });

  if (!isOk(slicesResult)) return slicesResult;
  const slices = slicesResult.data;

  // Load tasks for each slice
  const sliceStats: Array<{
    title: string;
    status: string;
    totalTasks: number;
    closedTasks: number;
  }> = [];

  let totalTasks = 0;
  let closedTasks = 0;

  for (const slice of slices) {
    const tasksResult = await deps.beadStore.list({
      label: 'tff:task',
      parentId: slice.id,
    });

    const tasks = isOk(tasksResult) ? tasksResult.data : [];
    const sliceClosed = tasks.filter((t) => t.status === 'closed').length;

    sliceStats.push({
      title: slice.title,
      status: slice.status,
      totalTasks: tasks.length,
      closedTasks: sliceClosed,
    });

    totalTasks += tasks.length;
    closedTasks += sliceClosed;
  }

  const closedSlices = slices.filter((s) => s.status === 'closed').length;

  // Generate markdown
  const lines: string[] = [
    `# State — ${input.milestoneName}`,
    '',
    '## Progress',
    `- Slices: ${closedSlices}/${slices.length} completed`,
    `- Tasks: ${closedTasks}/${totalTasks} completed`,
    '',
  ];

  if (sliceStats.length > 0) {
    lines.push('## Slices');
    lines.push('| Slice | Status | Tasks | Progress |');
    lines.push('|---|---|---|---|');

    for (const stat of sliceStats) {
      const pct = stat.totalTasks > 0
        ? Math.round((stat.closedTasks / stat.totalTasks) * 100)
        : 0;
      lines.push(
        `| ${stat.title} | ${stat.status} | ${stat.closedTasks}/${stat.totalTasks} | ${pct}% |`,
      );
    }
  }

  lines.push('');

  await deps.artifactStore.write('.tff/STATE.md', lines.join('\n'));

  return Ok(undefined);
};
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/application/sync/
git commit -m "feat: add generateState service for STATE.md generation"
```

---

### Task 8: Application Service — Checkpoint Save/Load

**Files:**
- Create: `tools/src/application/checkpoint/save-checkpoint.ts`
- Create: `tools/src/application/checkpoint/load-checkpoint.ts`
- Create: `tools/src/application/checkpoint/checkpoint.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/checkpoint/checkpoint.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { saveCheckpoint } from './save-checkpoint.js';
import { loadCheckpoint } from './load-checkpoint.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('checkpoint', () => {
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    artifactStore = new InMemoryArtifactStore();
  });

  const checkpointData = {
    sliceId: 'M01-S01',
    baseCommit: 'abc1234',
    currentWave: 2,
    completedWaves: [0, 1],
    completedTasks: ['T01', 'T02', 'T03'],
    executorLog: [
      { taskRef: 'T01', agent: 'backend-dev' },
      { taskRef: 'T02', agent: 'frontend-dev' },
      { taskRef: 'T03', agent: 'backend-dev' },
    ],
  };

  it('should save checkpoint as CHECKPOINT.md', async () => {
    const result = await saveCheckpoint(checkpointData, { artifactStore });

    expect(isOk(result)).toBe(true);
    expect(await artifactStore.exists('.tff/slices/M01-S01/CHECKPOINT.md')).toBe(true);
  });

  it('should load a saved checkpoint', async () => {
    await saveCheckpoint(checkpointData, { artifactStore });
    const result = await loadCheckpoint('M01-S01', { artifactStore });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.currentWave).toBe(2);
      expect(result.data.completedTasks).toEqual(['T01', 'T02', 'T03']);
      expect(result.data.executorLog).toHaveLength(3);
    }
  });

  it('should return error for non-existent checkpoint', async () => {
    const result = await loadCheckpoint('M01-S99', { artifactStore });
    expect(isErr(result)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement saveCheckpoint**

Create `tools/src/application/checkpoint/save-checkpoint.ts`:

```typescript
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

export interface CheckpointData {
  sliceId: string;
  baseCommit: string;
  currentWave: number;
  completedWaves: number[];
  completedTasks: string[];
  executorLog: Array<{ taskRef: string; agent: string }>;
}

interface SaveCheckpointDeps {
  artifactStore: ArtifactStore;
}

export const saveCheckpoint = async (
  data: CheckpointData,
  deps: SaveCheckpointDeps,
): Promise<Result<void, DomainError>> => {
  const lines: string[] = [
    `# Checkpoint — ${data.sliceId}`,
    `- Base commit: ${data.baseCommit}`,
    `- Current wave: ${data.currentWave}`,
    `- Completed waves: [${data.completedWaves.join(', ')}]`,
    `- Completed tasks: [${data.completedTasks.join(', ')}]`,
    `- Executor log: ${data.executorLog.map((e) => `${e.agent}→${e.taskRef}`).join(', ')}`,
    '',
    `<!-- checkpoint-json: ${JSON.stringify(data)} -->`,
    '',
  ];

  const path = `.tff/slices/${data.sliceId}/CHECKPOINT.md`;
  await deps.artifactStore.mkdir(`.tff/slices/${data.sliceId}`);
  await deps.artifactStore.write(path, lines.join('\n'));

  return Ok(undefined);
};
```

- [ ] **Step 4: Implement loadCheckpoint**

Create `tools/src/application/checkpoint/load-checkpoint.ts`:

```typescript
import { type Result, Ok, Err, isOk } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import { type CheckpointData } from './save-checkpoint.js';

interface LoadCheckpointDeps {
  artifactStore: ArtifactStore;
}

export const loadCheckpoint = async (
  sliceId: string,
  deps: LoadCheckpointDeps,
): Promise<Result<CheckpointData, DomainError>> => {
  const path = `.tff/slices/${sliceId}/CHECKPOINT.md`;

  const contentResult = await deps.artifactStore.read(path);
  if (!isOk(contentResult)) {
    return Err(
      createDomainError(
        'PROJECT_EXISTS', // reusing error code for "not found" — fine for now
        `No checkpoint found for slice "${sliceId}"`,
        { sliceId },
      ),
    );
  }

  // Extract JSON from HTML comment
  const match = contentResult.data.match(/<!-- checkpoint-json: (.+) -->/);
  if (!match) {
    return Err(
      createDomainError(
        'SYNC_CONFLICT',
        `Checkpoint file for "${sliceId}" is corrupted — no embedded JSON found`,
        { sliceId },
      ),
    );
  }

  const data = JSON.parse(match[1]) as CheckpointData;
  return Ok(data);
};
```

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

```bash
git add tools/src/application/checkpoint/
git commit -m "feat: add checkpoint save/load for execution resumability"
```

---

### Task 9: Infrastructure Adapter — MarkdownArtifactStore

**Files:**
- Create: `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.ts`
- Create: `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.spec.ts`

This adapter implements ArtifactStore using `node:fs/promises`. Integration test — uses real filesystem via `os.tmpdir()`.

- [ ] **Step 1: Write failing tests**

Create `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarkdownArtifactAdapter } from './markdown-artifact.adapter.js';
import { isOk, isErr } from '../../../domain/result.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('MarkdownArtifactAdapter', () => {
  let adapter: MarkdownArtifactAdapter;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tff-test-'));
    adapter = new MarkdownArtifactAdapter(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write and read a file', async () => {
    await adapter.write('test.md', '# Hello');
    const result = await adapter.read('test.md');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toBe('# Hello');
    }
  });

  it('should return error for non-existent file', async () => {
    const result = await adapter.read('nope.md');
    expect(isErr(result)).toBe(true);
  });

  it('should report file existence', async () => {
    expect(await adapter.exists('test.md')).toBe(false);
    await adapter.write('test.md', 'content');
    expect(await adapter.exists('test.md')).toBe(true);
  });

  it('should create directories', async () => {
    await adapter.mkdir('sub/dir');
    await adapter.write('sub/dir/file.md', 'nested');
    const result = await adapter.read('sub/dir/file.md');

    expect(isOk(result)).toBe(true);
  });

  it('should list files in directory', async () => {
    await adapter.mkdir('docs');
    await adapter.write('docs/a.md', 'a');
    await adapter.write('docs/b.md', 'b');

    const result = await adapter.list('docs');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement MarkdownArtifactAdapter**

Create `tools/src/infrastructure/adapters/filesystem/markdown-artifact.adapter.ts`:

```typescript
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { type ArtifactStore } from '../../../domain/ports/artifact-store.port.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

export class MarkdownArtifactAdapter implements ArtifactStore {
  constructor(private readonly basePath: string) {}

  private resolve(path: string): string {
    return join(this.basePath, path);
  }

  async read(path: string): Promise<Result<string, DomainError>> {
    try {
      const content = await readFile(this.resolve(path), 'utf-8');
      return Ok(content);
    } catch {
      return Err(
        createDomainError('PROJECT_EXISTS', `File not found: ${path}`, { path }),
      );
    }
  }

  async write(path: string, content: string): Promise<Result<void, DomainError>> {
    try {
      const fullPath = this.resolve(path);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      return Ok(undefined);
    } catch (err) {
      return Err(
        createDomainError('SYNC_CONFLICT', `Failed to write: ${path}`, { path, error: String(err) }),
      );
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(this.resolve(path));
      return true;
    } catch {
      return false;
    }
  }

  async list(directory: string): Promise<Result<string[], DomainError>> {
    try {
      const entries = await readdir(this.resolve(directory));
      return Ok(entries.map((e) => join(directory, e)));
    } catch {
      return Ok([]);
    }
  }

  async mkdir(path: string): Promise<Result<void, DomainError>> {
    try {
      await mkdir(this.resolve(path), { recursive: true });
      return Ok(undefined);
    } catch (err) {
      return Err(
        createDomainError('SYNC_CONFLICT', `Failed to mkdir: ${path}`, { path, error: String(err) }),
      );
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/src/infrastructure/adapters/filesystem/
git commit -m "feat: add MarkdownArtifactAdapter with filesystem implementation"
```

---

### Task 10: Infrastructure Adapter — BdCliAdapter

**Files:**
- Create: `tools/src/infrastructure/adapters/beads/bd-cli.adapter.ts`

No integration test yet — requires real `bd` CLI. Unit tests for the adapter would need mocking `execFile`, which adds complexity. We test this indirectly through application service tests using InMemoryBeadStore, and will add integration tests when running against a real `bd` instance.

- [ ] **Step 1: Implement BdCliAdapter**

Create `tools/src/infrastructure/adapters/beads/bd-cli.adapter.ts`:

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type BeadStore, type BeadData } from '../../../domain/ports/bead-store.port.js';
import { type BeadLabel } from '../../../domain/value-objects/bead-label.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);

const bdError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

const runBd = async (args: string[]): Promise<Result<string, DomainError>> => {
  try {
    const { stdout } = await exec('bd', args, { timeout: 10_000 });
    return Ok(stdout.trim());
  } catch (err) {
    return Err(bdError(`bd ${args.join(' ')} failed: ${err}`, { args }));
  }
};

const parseJsonOutput = <T>(output: string): Result<T, DomainError> => {
  try {
    return Ok(JSON.parse(output) as T);
  } catch {
    return Err(bdError('Failed to parse bd output as JSON', { output }));
  }
};

export class BdCliAdapter implements BeadStore {
  async create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>> {
    const args = ['create', '--label', input.label, '--title', input.title, '--json'];
    if (input.design) args.push('--design', input.design);
    if (input.parentId) args.push('--parent', input.parentId);

    const result = await runBd(args);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData>(result.data);
  }

  async get(id: string): Promise<Result<BeadData, DomainError>> {
    const result = await runBd(['show', id, '--json']);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData>(result.data);
  }

  async list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
  }): Promise<Result<BeadData[], DomainError>> {
    const args = ['list', '--json'];
    if (filter.label) args.push('--label', filter.label);
    if (filter.parentId) args.push('--parent', filter.parentId);
    if (filter.status) args.push('--status', filter.status);

    const result = await runBd(args);
    if (!result.ok) return result;
    return parseJsonOutput<BeadData[]>(result.data);
  }

  async updateStatus(id: string, status: string): Promise<Result<void, DomainError>> {
    const result = await runBd(['update', id, '--status', status]);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async updateDesign(id: string, design: string): Promise<Result<void, DomainError>> {
    const result = await runBd(['update', id, '--design', design]);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>> {
    const result = await runBd(['kv', 'set', `${id}.${key}`, value]);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async addDependency(
    fromId: string,
    toId: string,
    type: 'blocks' | 'validates',
  ): Promise<Result<void, DomainError>> {
    const result = await runBd(['link', fromId, toId, '--type', type]);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async close(id: string): Promise<Result<void, DomainError>> {
    const result = await runBd(['close', id]);
    if (!result.ok) return result;
    return Ok(undefined);
  }
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add tools/src/infrastructure/adapters/beads/
git commit -m "feat: add BdCliAdapter wrapping beads CLI for bead store port"
```

---

### Task 11: Infrastructure Adapter — GitCliAdapter

**Files:**
- Create: `tools/src/infrastructure/adapters/git/git-cli.adapter.ts`

Same rationale as BdCliAdapter — no integration test, tested indirectly via in-memory adapter.

- [ ] **Step 1: Implement GitCliAdapter**

Create `tools/src/infrastructure/adapters/git/git-cli.adapter.ts`:

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type GitOps } from '../../../domain/ports/git-ops.port.js';
import { type CommitRef } from '../../../domain/value-objects/commit-ref.js';
import { type Result, Ok, Err } from '../../../domain/result.js';
import { type DomainError, createDomainError } from '../../../domain/errors/domain-error.js';

const exec = promisify(execFile);

const gitError = (message: string, context?: Record<string, unknown>): DomainError =>
  createDomainError('SYNC_CONFLICT', message, context);

const runGit = async (
  args: string[],
  cwd?: string,
): Promise<Result<string, DomainError>> => {
  try {
    const { stdout } = await exec('git', args, { cwd, timeout: 30_000 });
    return Ok(stdout.trim());
  } catch (err) {
    return Err(gitError(`git ${args.join(' ')} failed: ${err}`, { args }));
  }
};

export class GitCliAdapter implements GitOps {
  constructor(private readonly repoRoot: string) {}

  async createBranch(name: string, from: string): Promise<Result<void, DomainError>> {
    const result = await runGit(['branch', name, from], this.repoRoot);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async createWorktree(path: string, branch: string): Promise<Result<void, DomainError>> {
    const result = await runGit(
      ['worktree', 'add', path, '-b', branch],
      this.repoRoot,
    );
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async deleteWorktree(path: string): Promise<Result<void, DomainError>> {
    const result = await runGit(
      ['worktree', 'remove', path, '--force'],
      this.repoRoot,
    );
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async listWorktrees(): Promise<Result<string[], DomainError>> {
    const result = await runGit(['worktree', 'list', '--porcelain'], this.repoRoot);
    if (!result.ok) return result;

    const paths = result.data
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.replace('worktree ', ''));

    return Ok(paths);
  }

  async commit(
    message: string,
    files: string[],
    worktreePath?: string,
  ): Promise<Result<CommitRef, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;

    // Stage files
    const addResult = await runGit(['add', ...files], cwd);
    if (!addResult.ok) return addResult;

    // Commit
    const commitResult = await runGit(['commit', '-m', message], cwd);
    if (!commitResult.ok) return commitResult;

    // Get SHA
    const shaResult = await runGit(['rev-parse', '--short', 'HEAD'], cwd);
    if (!shaResult.ok) return shaResult;

    return Ok({ sha: shaResult.data, message });
  }

  async revert(
    commitSha: string,
    worktreePath?: string,
  ): Promise<Result<CommitRef, DomainError>> {
    const cwd = worktreePath ?? this.repoRoot;
    const result = await runGit(['revert', '--no-edit', commitSha], cwd);
    if (!result.ok) return result;

    const shaResult = await runGit(['rev-parse', '--short', 'HEAD'], cwd);
    if (!shaResult.ok) return shaResult;

    return Ok({ sha: shaResult.data, message: `Revert "${commitSha}"` });
  }

  async merge(source: string, target: string): Promise<Result<void, DomainError>> {
    await runGit(['checkout', target], this.repoRoot);
    const result = await runGit(['merge', source, '--no-ff'], this.repoRoot);
    if (!result.ok) return result;
    return Ok(undefined);
  }

  async getCurrentBranch(worktreePath?: string): Promise<Result<string, DomainError>> {
    return runGit(['rev-parse', '--abbrev-ref', 'HEAD'], worktreePath ?? this.repoRoot);
  }

  async getHeadSha(worktreePath?: string): Promise<Result<string, DomainError>> {
    return runGit(['rev-parse', '--short', 'HEAD'], worktreePath ?? this.repoRoot);
  }
}
```

- [ ] **Step 2: Run type check**

- [ ] **Step 3: Commit**

```bash
git add tools/src/infrastructure/adapters/git/
git commit -m "feat: add GitCliAdapter wrapping git CLI for git ops port"
```

---

### Task 12: Infrastructure Adapter — ReviewMetadataAdapter

**Files:**
- Create: `tools/src/infrastructure/adapters/review/review-metadata.adapter.ts`

Uses beads metadata (`bd kv`) to store review records.

- [ ] **Step 1: Implement ReviewMetadataAdapter**

Create `tools/src/infrastructure/adapters/review/review-metadata.adapter.ts`:

```typescript
import { type ReviewStore, type ReviewRecord } from '../../../domain/ports/review-store.port.js';
import { type Result, Ok, isOk } from '../../../domain/result.js';
import { type DomainError } from '../../../domain/errors/domain-error.js';
import { type BeadStore } from '../../../domain/ports/bead-store.port.js';

export class ReviewMetadataAdapter implements ReviewStore {
  constructor(private readonly beadStore: BeadStore) {}

  async record(review: ReviewRecord): Promise<Result<void, DomainError>> {
    const key = `review.${review.reviewerAgent}.${Date.now()}`;
    const value = JSON.stringify({
      status: review.status,
      reviewedAt: review.reviewedAt.toISOString(),
    });

    // Store as bead metadata on the slice bead
    // The sliceId here is the bead ID
    return this.beadStore.updateMetadata(review.sliceId, key, value);
  }

  async getExecutorsForSlice(sliceId: string): Promise<Result<string[], DomainError>> {
    // Load all tasks for this slice, extract executor metadata
    const tasksResult = await this.beadStore.list({
      label: 'tff:task',
      parentId: sliceId,
    });

    if (!isOk(tasksResult)) return tasksResult;

    const executors = tasksResult.data
      .filter((t) => t.metadata?.executor)
      .map((t) => t.metadata!.executor);

    return Ok([...new Set(executors)]);
  }

  async getReviewsForSlice(sliceId: string): Promise<Result<ReviewRecord[], DomainError>> {
    const beadResult = await this.beadStore.get(sliceId);
    if (!isOk(beadResult)) return beadResult as Result<never, DomainError>;

    const reviews: ReviewRecord[] = [];
    const metadata = beadResult.data.metadata ?? {};

    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith('review.')) {
        const parts = key.split('.');
        const reviewerAgent = parts[1];
        const parsed = JSON.parse(value);
        reviews.push({
          sliceId,
          reviewerAgent,
          status: parsed.status,
          reviewedAt: new Date(parsed.reviewedAt),
        });
      }
    }

    return Ok(reviews);
  }
}
```

- [ ] **Step 2: Run type check**

- [ ] **Step 3: Commit**

```bash
git add tools/src/infrastructure/adapters/review/
git commit -m "feat: add ReviewMetadataAdapter using beads KV for review tracking"
```

---

### Task 13: CLI Command Router

**Files:**
- Modify: `tools/src/cli/index.ts`
- Create: `tools/src/cli/commands/project-init.cmd.ts`
- Create: `tools/src/cli/commands/project-get.cmd.ts`
- Create: `tools/src/cli/commands/slice-transition.cmd.ts`
- Create: `tools/src/cli/commands/slice-classify.cmd.ts`
- Create: `tools/src/cli/commands/waves-detect.cmd.ts`
- Create: `tools/src/cli/commands/review-check-fresh.cmd.ts`
- Create: `tools/src/cli/commands/sync-state.cmd.ts`
- Create: `tools/src/cli/commands/checkpoint-save.cmd.ts`
- Create: `tools/src/cli/commands/checkpoint-load.cmd.ts`

Implement the CLI commands that wire adapters to application services. Each command parses args from `process.argv`, instantiates real adapters, calls the application service, and outputs JSON.

- [ ] **Step 1: Create project:init command**

Create `tools/src/cli/commands/project-init.cmd.ts`:

```typescript
import { initProject } from '../../application/project/init-project.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { MarkdownArtifactAdapter } from '../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js';
import { isOk } from '../../domain/result.js';

export const projectInitCmd = async (args: string[]): Promise<string> => {
  const name = args[0];
  const vision = args.slice(1).join(' ') || name;

  if (!name) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: project:init <name> [vision]' },
    });
  }

  const beadStore = new BdCliAdapter();
  const artifactStore = new MarkdownArtifactAdapter(process.cwd());

  const result = await initProject({ name, vision }, { beadStore, artifactStore });

  if (isOk(result)) {
    return JSON.stringify({ ok: true, data: result.data });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 2: Create slice:classify command**

Create `tools/src/cli/commands/slice-classify.cmd.ts`:

```typescript
import { classifyComplexity } from '../../application/lifecycle/classify-complexity.js';

export const sliceClassifyCmd = async (args: string[]): Promise<string> => {
  // Accept JSON input from stdin or args
  const input = args[0];
  if (!input) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: slice:classify <json-signals>' },
    });
  }

  try {
    const signals = JSON.parse(input);
    const tier = classifyComplexity(signals);
    return JSON.stringify({ ok: true, data: { tier } });
  } catch {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Invalid JSON input' },
    });
  }
};
```

- [ ] **Step 3: Create waves:detect command**

Create `tools/src/cli/commands/waves-detect.cmd.ts`:

```typescript
import { detectWaves } from '../../application/waves/detect-waves.js';
import { isOk } from '../../domain/result.js';

export const wavesDetectCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: waves:detect <json-tasks>' },
    });
  }

  try {
    const tasks = JSON.parse(input);
    const result = detectWaves(tasks);

    if (isOk(result)) {
      return JSON.stringify({ ok: true, data: result.data });
    }
    return JSON.stringify({ ok: false, error: result.error });
  } catch {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Invalid JSON input' },
    });
  }
};
```

- [ ] **Step 4: Create review:check-fresh command**

Create `tools/src/cli/commands/review-check-fresh.cmd.ts`:

```typescript
import { enforceFreshReviewer } from '../../application/review/enforce-fresh-reviewer.js';
import { BdCliAdapter } from '../../infrastructure/adapters/beads/bd-cli.adapter.js';
import { ReviewMetadataAdapter } from '../../infrastructure/adapters/review/review-metadata.adapter.js';
import { isOk } from '../../domain/result.js';

export const reviewCheckFreshCmd = async (args: string[]): Promise<string> => {
  const [sliceId, agent] = args;
  if (!sliceId || !agent) {
    return JSON.stringify({
      ok: false,
      error: { code: 'INVALID_ARGS', message: 'Usage: review:check-fresh <slice-id> <agent>' },
    });
  }

  const beadStore = new BdCliAdapter();
  const reviewStore = new ReviewMetadataAdapter(beadStore);

  const result = await enforceFreshReviewer(
    { sliceId, reviewerAgent: agent },
    { reviewStore },
  );

  if (isOk(result)) {
    return JSON.stringify({ ok: true, data: null });
  }
  return JSON.stringify({ ok: false, error: result.error });
};
```

- [ ] **Step 5: Update CLI entry point**

Update `tools/src/cli/index.ts` to route commands:

```typescript
import { projectInitCmd } from './commands/project-init.cmd.js';
import { sliceClassifyCmd } from './commands/slice-classify.cmd.js';
import { wavesDetectCmd } from './commands/waves-detect.cmd.js';
import { reviewCheckFreshCmd } from './commands/review-check-fresh.cmd.js';

type CommandFn = (args: string[]) => Promise<string>;

const commands: Record<string, CommandFn> = {
  'project:init': projectInitCmd,
  'slice:classify': sliceClassifyCmd,
  'waves:detect': wavesDetectCmd,
  'review:check-fresh': reviewCheckFreshCmd,
};

const allCommands = [
  'project:init', 'project:get', 'milestone:create', 'milestone:list',
  'slice:create', 'slice:transition', 'slice:classify', 'waves:detect',
  'sync:reconcile', 'sync:state', 'worktree:create', 'worktree:delete',
  'worktree:list', 'review:record', 'review:check-fresh',
  'checkpoint:save', 'checkpoint:load',
];

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    console.log(JSON.stringify({
      ok: true,
      data: { name: 'tff-tools', version: '0.1.0', commands: allCommands },
    }));
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.log(JSON.stringify({
      ok: false,
      error: { code: 'NOT_IMPLEMENTED', message: `Command "${command}" not yet implemented` },
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

- [ ] **Step 6: Run type check and rebuild**

```bash
npx tsc --noEmit -p tools/tsconfig.json && npx tsup
```

- [ ] **Step 7: Verify CLI works**

```bash
node tools/dist/tff-tools.cjs --help
node tools/dist/tff-tools.cjs slice:classify '{"taskCount":2,"estimatedFilesAffected":3,"modulesAffected":1,"hasExternalIntegrations":false,"unknownsSurfaced":0}'
node tools/dist/tff-tools.cjs waves:detect '[{"id":"t1","dependsOn":[]},{"id":"t2","dependsOn":["t1"]}]'
```

- [ ] **Step 8: Commit**

```bash
git add tools/src/cli/ tools/dist/tff-tools.cjs
git commit -m "feat: add CLI command router with project:init, slice:classify, waves:detect, review:check-fresh"
```

---

### Task 14: Full Test Suite + Application Barrel Export

**Files:**
- Create: `tools/src/application/index.ts`

- [ ] **Step 1: Create application barrel export**

Create `tools/src/application/index.ts`:

```typescript
export { initProject } from './project/init-project.js';
export { classifyComplexity } from './lifecycle/classify-complexity.js';
export { transitionSliceUseCase } from './lifecycle/transition-slice.js';
export { detectWaves } from './waves/detect-waves.js';
export { enforceFreshReviewer } from './review/enforce-fresh-reviewer.js';
export { generateState } from './sync/generate-state.js';
export { saveCheckpoint, type CheckpointData } from './checkpoint/save-checkpoint.js';
export { loadCheckpoint } from './checkpoint/load-checkpoint.js';
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC/tools && npx vitest run
```

All tests should pass.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

- [ ] **Step 4: Commit**

```bash
git add tools/src/application/index.ts
git commit -m "feat: add application layer barrel export"
```
