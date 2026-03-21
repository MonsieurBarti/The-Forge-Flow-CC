# Plan 1: Domain Foundation + Tooling Scaffold

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the TypeScript tooling scaffold with hexagonal domain layer — Result type, Zod schemas, entities, value objects, ports, domain events, and domain errors — all fully tested with colocated specs.

**Architecture:** Single-package CC plugin with TypeScript tooling compiled to CJS via tsup. Domain layer follows hexagonal architecture: zero infrastructure imports, Zod-first types, Result monad for error handling. All tests colocated as `.spec.ts` using Vitest with in-memory adapters.

**Tech Stack:** TypeScript (strict), Zod, Vitest, tsup, Node.js 20+

**Spec:** `docs/superpowers/specs/2026-03-21-the-forge-flow-design.md`

---

## File Structure

```
the-forge-flow/
  .claude-plugin/
    plugin.json
    marketplace.json
  package.json
  tsconfig.json
  tools/
    tsconfig.json
    vitest.config.ts
    tsup.config.ts
    src/
      domain/
        result.ts
        result.spec.ts
        value-objects/
          complexity-tier.ts
          complexity-tier.spec.ts
          slice-status.ts
          slice-status.spec.ts
          bead-label.ts
          bead-label.spec.ts
          commit-ref.ts
          commit-ref.spec.ts
          wave.ts
          wave.spec.ts
          sync-report.ts
          sync-report.spec.ts
        entities/
          project.ts
          project.spec.ts
          milestone.ts
          milestone.spec.ts
          slice.ts
          slice.spec.ts
          task.ts
          task.spec.ts
        ports/
          bead-store.port.ts
          artifact-store.port.ts
          git-ops.port.ts
          review-store.port.ts
        events/
          domain-event.ts
          slice-planned.event.ts
          slice-status-changed.event.ts
          task-completed.event.ts
          sync-conflict.event.ts
        errors/
          domain-error.ts
          project-exists.error.ts
          invalid-transition.error.ts
          sync-conflict.error.ts
          fresh-reviewer-violation.error.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tools/tsconfig.json`
- Create: `tools/vitest.config.ts`
- Create: `tools/tsup.config.ts`
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm package**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC
npm init -y
```

Then replace `package.json` with:

```json
{
  "name": "the-forge-flow",
  "version": "0.1.0",
  "description": "Autonomous coding agent orchestrator for Claude Code",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tools/tsconfig.json"
  },
  "keywords": ["claude-code", "beads", "plannotator", "orchestration"],
  "license": "MIT",
  "author": "MonsieurBarti"
}
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D typescript zod vitest tsup @types/node
```

- [ ] **Step 3: Create root tsconfig.json**

```json
{
  "references": [{ "path": "./tools" }],
  "files": []
}
```

- [ ] **Step 4: Create tools/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts", "dist"]
}
```

- [ ] **Step 5: Create tools/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    globals: true,
  },
});
```

- [ ] **Step 6: Create tools/tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['tools/src/cli/index.ts'],
  outDir: 'tools/dist',
  format: ['cjs'],
  target: 'node20',
  clean: true,
  noExternal: [/(.*)/],
  banner: { js: '#!/usr/bin/env node' },
});
```

- [ ] **Step 7: Create .claude-plugin/plugin.json**

```json
{
  "name": "the-forge-flow",
  "description": "Autonomous coding agent orchestrator with dual markdown+beads state, plannotator integration, and wave-based parallel execution",
  "version": "0.1.0",
  "author": { "name": "MonsieurBarti" },
  "repository": "https://github.com/MonsieurBarti/the-forge-flow",
  "keywords": ["orchestration", "beads", "plannotator", "agents", "tdd"]
}
```

- [ ] **Step 8: Create .claude-plugin/marketplace.json**

```json
{
  "name": "the-forge-flow",
  "owner": { "name": "MonsieurBarti" },
  "plugins": [{
    "name": "the-forge-flow",
    "source": ".",
    "description": "Autonomous coding agent orchestrator"
  }]
}
```

- [ ] **Step 9: Create .gitignore**

```
node_modules/
*.tsbuildinfo
.tff/worktrees/
```

- [ ] **Step 10: Verify scaffold compiles**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

Expected: No errors (no source files yet, clean compile).

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json tools/tsconfig.json tools/vitest.config.ts tools/tsup.config.ts .claude-plugin/plugin.json .claude-plugin/marketplace.json .gitignore package-lock.json
git commit -m "chore: scaffold project with TypeScript, Vitest, tsup, and CC plugin manifest"
```

---

### Task 2: Result Type

**Files:**
- Create: `tools/src/domain/result.ts`
- Create: `tools/src/domain/result.spec.ts`

- [ ] **Step 1: Write failing tests for Result type**

Create `tools/src/domain/result.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Ok, Err, isOk, isErr, match } from './result.js';

describe('Result', () => {
  describe('Ok', () => {
    it('should create an Ok result with data', () => {
      const result = Ok('hello');
      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should identify Ok with isOk', () => {
      expect(isOk(Ok(42))).toBe(true);
      expect(isOk(Err('fail'))).toBe(false);
    });
  });

  describe('Err', () => {
    it('should create an Err result with error', () => {
      const result = Err('something broke');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('something broke');
    });

    it('should identify Err with isErr', () => {
      expect(isErr(Err('fail'))).toBe(true);
      expect(isErr(Ok(42))).toBe(false);
    });
  });

  describe('match', () => {
    it('should call onOk for Ok result', () => {
      const result = Ok(10);
      const output = match(result, {
        onOk: (data) => data * 2,
        onErr: () => -1,
      });
      expect(output).toBe(20);
    });

    it('should call onErr for Err result', () => {
      const result = Err('broken');
      const output = match(result, {
        onOk: () => 'nope',
        onErr: (error) => `error: ${error}`,
      });
      expect(output).toBe('error: broken');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: FAIL — module `./result.js` not found.

- [ ] **Step 3: Implement Result type**

Create `tools/src/domain/result.ts`:

```typescript
export type Result<T, E> = OkResult<T> | ErrResult<E>;

export interface OkResult<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ErrResult<E> {
  readonly ok: false;
  readonly error: E;
}

export const Ok = <T>(data: T): OkResult<T> => ({ ok: true, data });

export const Err = <E>(error: E): ErrResult<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is OkResult<T> =>
  result.ok === true;

export const isErr = <T, E>(result: Result<T, E>): result is ErrResult<E> =>
  result.ok === false;

export const match = <T, E, R>(
  result: Result<T, E>,
  handlers: { onOk: (data: T) => R; onErr: (error: E) => R },
): R => (result.ok ? handlers.onOk(result.data) : handlers.onErr(result.error));
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/result.ts tools/src/domain/result.spec.ts
git commit -m "feat: add Result<T, E> monad with Ok, Err, isOk, isErr, match"
```

---

### Task 3: Domain Errors

**Files:**
- Create: `tools/src/domain/errors/domain-error.ts`
- Create: `tools/src/domain/errors/project-exists.error.ts`
- Create: `tools/src/domain/errors/invalid-transition.error.ts`
- Create: `tools/src/domain/errors/sync-conflict.error.ts`
- Create: `tools/src/domain/errors/fresh-reviewer-violation.error.ts`

No spec file — these are pure data types (Zod schemas + inferred types). Tested via the entities/services that use them.

- [ ] **Step 1: Create base domain error schema**

Create `tools/src/domain/errors/domain-error.ts`:

```typescript
import { z } from 'zod';

export const DomainErrorCodeSchema = z.enum([
  'PROJECT_EXISTS',
  'INVALID_TRANSITION',
  'SYNC_CONFLICT',
  'FRESH_REVIEWER_VIOLATION',
]);

export type DomainErrorCode = z.infer<typeof DomainErrorCodeSchema>;

export const DomainErrorSchema = z.object({
  code: DomainErrorCodeSchema,
  message: z.string(),
  context: z.record(z.unknown()).optional(),
});

export type DomainError = z.infer<typeof DomainErrorSchema>;

export const createDomainError = (
  code: DomainErrorCode,
  message: string,
  context?: Record<string, unknown>,
): DomainError => DomainErrorSchema.parse({ code, message, context });
```

- [ ] **Step 2: Create specific error constructors**

Create `tools/src/domain/errors/project-exists.error.ts`:

```typescript
import { createDomainError } from './domain-error.js';

export const projectExistsError = (projectName: string) =>
  createDomainError(
    'PROJECT_EXISTS',
    `Project "${projectName}" already exists in this repository`,
    { projectName },
  );
```

Create `tools/src/domain/errors/invalid-transition.error.ts`:

```typescript
import { createDomainError } from './domain-error.js';

export const invalidTransitionError = (
  sliceId: string,
  from: string,
  to: string,
) =>
  createDomainError(
    'INVALID_TRANSITION',
    `Cannot transition slice "${sliceId}" from "${from}" to "${to}"`,
    { sliceId, from, to },
  );
```

Create `tools/src/domain/errors/sync-conflict.error.ts`:

```typescript
import { createDomainError } from './domain-error.js';

export const syncConflictError = (
  entityId: string,
  field: string,
  mdValue: string,
  beadValue: string,
) =>
  createDomainError(
    'SYNC_CONFLICT',
    `Sync conflict on "${entityId}" field "${field}": markdown="${mdValue}", bead="${beadValue}"`,
    { entityId, field, mdValue, beadValue },
  );
```

Create `tools/src/domain/errors/fresh-reviewer-violation.error.ts`:

```typescript
import { createDomainError } from './domain-error.js';

export const freshReviewerViolationError = (
  sliceId: string,
  agentRole: string,
) =>
  createDomainError(
    'FRESH_REVIEWER_VIOLATION',
    `Agent "${agentRole}" cannot review slice "${sliceId}" — was the executor`,
    { sliceId, agentRole },
  );
```

- [ ] **Step 3: Commit**

```bash
git add tools/src/domain/errors/
git commit -m "feat: add domain error types with Zod schemas"
```

---

### Task 4: Domain Events

**Files:**
- Create: `tools/src/domain/events/domain-event.ts`
- Create: `tools/src/domain/events/slice-planned.event.ts`
- Create: `tools/src/domain/events/slice-status-changed.event.ts`
- Create: `tools/src/domain/events/task-completed.event.ts`
- Create: `tools/src/domain/events/sync-conflict.event.ts`

No spec file — pure data types. Tested via entities that emit them.

- [ ] **Step 1: Create base domain event**

Create `tools/src/domain/events/domain-event.ts`:

```typescript
import { z } from 'zod';

export const DomainEventTypeSchema = z.enum([
  'SLICE_PLANNED',
  'SLICE_STATUS_CHANGED',
  'TASK_COMPLETED',
  'SYNC_CONFLICT',
]);

export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;

export const DomainEventSchema = z.object({
  id: z.string(),
  type: DomainEventTypeSchema,
  occurredAt: z.date(),
  payload: z.record(z.unknown()),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

export const createDomainEvent = (
  type: DomainEventType,
  payload: Record<string, unknown>,
): DomainEvent => ({
  id: crypto.randomUUID(),
  type,
  occurredAt: new Date(),
  payload,
});
```

- [ ] **Step 2: Create specific event factories**

Create `tools/src/domain/events/slice-planned.event.ts`:

```typescript
import { createDomainEvent } from './domain-event.js';

export const slicePlannedEvent = (sliceId: string, taskCount: number) =>
  createDomainEvent('SLICE_PLANNED', { sliceId, taskCount });
```

Create `tools/src/domain/events/slice-status-changed.event.ts`:

```typescript
import { createDomainEvent } from './domain-event.js';

export const sliceStatusChangedEvent = (
  sliceId: string,
  from: string,
  to: string,
) => createDomainEvent('SLICE_STATUS_CHANGED', { sliceId, from, to });
```

Create `tools/src/domain/events/task-completed.event.ts`:

```typescript
import { createDomainEvent } from './domain-event.js';

export const taskCompletedEvent = (
  taskId: string,
  sliceId: string,
  executor: string,
) => createDomainEvent('TASK_COMPLETED', { taskId, sliceId, executor });
```

Create `tools/src/domain/events/sync-conflict.event.ts`:

```typescript
import { createDomainEvent } from './domain-event.js';

export const syncConflictEvent = (
  entityId: string,
  field: string,
  winner: 'markdown' | 'beads',
) => createDomainEvent('SYNC_CONFLICT', { entityId, field, winner });
```

- [ ] **Step 3: Commit**

```bash
git add tools/src/domain/events/
git commit -m "feat: add domain event types with factory functions"
```

---

### Task 5: Value Object — ComplexityTier

**Files:**
- Create: `tools/src/domain/value-objects/complexity-tier.ts`
- Create: `tools/src/domain/value-objects/complexity-tier.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/value-objects/complexity-tier.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ComplexityTierSchema,
  type ComplexityTier,
  tierConfig,
} from './complexity-tier.js';

describe('ComplexityTier', () => {
  it('should accept valid tiers', () => {
    expect(ComplexityTierSchema.parse('S')).toBe('S');
    expect(ComplexityTierSchema.parse('F-lite')).toBe('F-lite');
    expect(ComplexityTierSchema.parse('F-full')).toBe('F-full');
  });

  it('should reject invalid tiers', () => {
    expect(() => ComplexityTierSchema.parse('XXL')).toThrow();
  });

  it('should have correct config for S tier', () => {
    const config = tierConfig('S');
    expect(config.brainstormer).toBe(false);
    expect(config.research).toBe('skip');
    expect(config.tdd).toBe(false);
  });

  it('should have correct config for F-lite tier', () => {
    const config = tierConfig('F-lite');
    expect(config.brainstormer).toBe(true);
    expect(config.research).toBe('optional');
    expect(config.tdd).toBe(true);
  });

  it('should have correct config for F-full tier', () => {
    const config = tierConfig('F-full');
    expect(config.brainstormer).toBe(true);
    expect(config.research).toBe('required');
    expect(config.tdd).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/value-objects/complexity-tier.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement ComplexityTier**

Create `tools/src/domain/value-objects/complexity-tier.ts`:

```typescript
import { z } from 'zod';

export const ComplexityTierSchema = z.enum(['S', 'F-lite', 'F-full']);
export type ComplexityTier = z.infer<typeof ComplexityTierSchema>;

export const TierConfigSchema = z.object({
  brainstormer: z.boolean(),
  research: z.enum(['skip', 'optional', 'required']),
  freshReviewer: z.literal(true),
  tdd: z.boolean(),
});

export type TierConfig = z.infer<typeof TierConfigSchema>;

const configs: Record<ComplexityTier, TierConfig> = {
  S: {
    brainstormer: false,
    research: 'skip',
    freshReviewer: true,
    tdd: false,
  },
  'F-lite': {
    brainstormer: true,
    research: 'optional',
    freshReviewer: true,
    tdd: true,
  },
  'F-full': {
    brainstormer: true,
    research: 'required',
    freshReviewer: true,
    tdd: true,
  },
};

export const tierConfig = (tier: ComplexityTier): TierConfig => configs[tier];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/value-objects/complexity-tier.spec.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/value-objects/complexity-tier.ts tools/src/domain/value-objects/complexity-tier.spec.ts
git commit -m "feat: add ComplexityTier value object with tier configs"
```

---

### Task 6: Value Object — SliceStatus (State Machine)

**Files:**
- Create: `tools/src/domain/value-objects/slice-status.ts`
- Create: `tools/src/domain/value-objects/slice-status.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/value-objects/slice-status.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  SliceStatusSchema,
  canTransition,
  validTransitionsFrom,
} from './slice-status.js';

describe('SliceStatus', () => {
  it('should accept all valid statuses', () => {
    const statuses = [
      'discussing', 'researching', 'planning', 'executing',
      'verifying', 'reviewing', 'completing', 'closed',
    ];
    for (const s of statuses) {
      expect(SliceStatusSchema.parse(s)).toBe(s);
    }
  });

  it('should reject invalid status', () => {
    expect(() => SliceStatusSchema.parse('flying')).toThrow();
  });

  describe('canTransition', () => {
    it('should allow discussing → researching', () => {
      expect(canTransition('discussing', 'researching')).toBe(true);
    });

    it('should allow researching → planning', () => {
      expect(canTransition('researching', 'planning')).toBe(true);
    });

    it('should allow planning → executing', () => {
      expect(canTransition('planning', 'executing')).toBe(true);
    });

    it('should allow executing → verifying', () => {
      expect(canTransition('executing', 'verifying')).toBe(true);
    });

    it('should allow verifying → reviewing', () => {
      expect(canTransition('verifying', 'reviewing')).toBe(true);
    });

    it('should allow reviewing → completing', () => {
      expect(canTransition('reviewing', 'completing')).toBe(true);
    });

    it('should allow completing → closed', () => {
      expect(canTransition('completing', 'closed')).toBe(true);
    });

    it('should allow verifying → executing (replan loop)', () => {
      expect(canTransition('verifying', 'executing')).toBe(true);
    });

    it('should allow reviewing → executing (fix loop)', () => {
      expect(canTransition('reviewing', 'executing')).toBe(true);
    });

    it('should allow planning → planning (revision loop)', () => {
      expect(canTransition('planning', 'planning')).toBe(true);
    });

    it('should reject discussing → executing (skip)', () => {
      expect(canTransition('discussing', 'executing')).toBe(false);
    });

    it('should reject closed → anything', () => {
      expect(canTransition('closed', 'discussing')).toBe(false);
    });
  });

  describe('validTransitionsFrom', () => {
    it('should return valid next statuses for discussing', () => {
      expect(validTransitionsFrom('discussing')).toEqual(['researching']);
    });

    it('should return multiple options for verifying', () => {
      const transitions = validTransitionsFrom('verifying');
      expect(transitions).toContain('reviewing');
      expect(transitions).toContain('executing');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/value-objects/slice-status.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement SliceStatus**

Create `tools/src/domain/value-objects/slice-status.ts`:

```typescript
import { z } from 'zod';

export const SliceStatusSchema = z.enum([
  'discussing',
  'researching',
  'planning',
  'executing',
  'verifying',
  'reviewing',
  'completing',
  'closed',
]);

export type SliceStatus = z.infer<typeof SliceStatusSchema>;

const transitions: Record<SliceStatus, readonly SliceStatus[]> = {
  discussing: ['researching'],
  researching: ['planning'],
  planning: ['planning', 'executing'],
  executing: ['verifying'],
  verifying: ['reviewing', 'executing'],
  reviewing: ['completing', 'executing'],
  completing: ['closed'],
  closed: [],
};

export const canTransition = (from: SliceStatus, to: SliceStatus): boolean =>
  transitions[from].includes(to);

export const validTransitionsFrom = (status: SliceStatus): readonly SliceStatus[] =>
  transitions[status];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/value-objects/slice-status.spec.ts
```

Expected: All 13 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/value-objects/slice-status.ts tools/src/domain/value-objects/slice-status.spec.ts
git commit -m "feat: add SliceStatus state machine with transition validation"
```

---

### Task 7: Value Objects — BeadLabel, CommitRef, Wave, SyncReport

**Files:**
- Create: `tools/src/domain/value-objects/bead-label.ts`
- Create: `tools/src/domain/value-objects/bead-label.spec.ts`
- Create: `tools/src/domain/value-objects/commit-ref.ts`
- Create: `tools/src/domain/value-objects/commit-ref.spec.ts`
- Create: `tools/src/domain/value-objects/wave.ts`
- Create: `tools/src/domain/value-objects/wave.spec.ts`
- Create: `tools/src/domain/value-objects/sync-report.ts`
- Create: `tools/src/domain/value-objects/sync-report.spec.ts`

- [ ] **Step 1: Write failing tests for BeadLabel**

Create `tools/src/domain/value-objects/bead-label.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BeadLabelSchema, type BeadLabel } from './bead-label.js';

describe('BeadLabel', () => {
  it('should accept all valid labels', () => {
    const labels: BeadLabel[] = [
      'tff:project', 'tff:milestone', 'tff:slice',
      'tff:req', 'tff:task', 'tff:research',
    ];
    for (const l of labels) {
      expect(BeadLabelSchema.parse(l)).toBe(l);
    }
  });

  it('should reject invalid labels', () => {
    expect(() => BeadLabelSchema.parse('tff:unknown')).toThrow();
    expect(() => BeadLabelSchema.parse('forge:task')).toThrow();
  });
});
```

- [ ] **Step 2: Write failing tests for CommitRef**

Create `tools/src/domain/value-objects/commit-ref.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CommitRefSchema } from './commit-ref.js';

describe('CommitRef', () => {
  it('should accept a valid 40-char SHA', () => {
    const sha = 'a'.repeat(40);
    const ref = CommitRefSchema.parse({ sha, message: 'feat: something' });
    expect(ref.sha).toBe(sha);
  });

  it('should accept a valid 7-char short SHA', () => {
    const ref = CommitRefSchema.parse({ sha: 'abc1234', message: 'fix: thing' });
    expect(ref.sha).toBe('abc1234');
  });

  it('should reject an empty sha', () => {
    expect(() => CommitRefSchema.parse({ sha: '', message: 'nope' })).toThrow();
  });
});
```

- [ ] **Step 3: Write failing tests for Wave**

Create `tools/src/domain/value-objects/wave.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WaveSchema } from './wave.js';

describe('Wave', () => {
  it('should accept a valid wave', () => {
    const wave = WaveSchema.parse({ index: 0, taskIds: ['t1', 't2'] });
    expect(wave.index).toBe(0);
    expect(wave.taskIds).toEqual(['t1', 't2']);
  });

  it('should reject negative index', () => {
    expect(() => WaveSchema.parse({ index: -1, taskIds: ['t1'] })).toThrow();
  });

  it('should reject empty taskIds', () => {
    expect(() => WaveSchema.parse({ index: 0, taskIds: [] })).toThrow();
  });
});
```

- [ ] **Step 4: Write failing tests for SyncReport**

Create `tools/src/domain/value-objects/sync-report.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SyncReportSchema, emptySyncReport } from './sync-report.js';

describe('SyncReport', () => {
  it('should create an empty sync report', () => {
    const report = emptySyncReport();
    expect(report.created).toEqual([]);
    expect(report.updated).toEqual([]);
    expect(report.conflicts).toEqual([]);
    expect(report.orphans).toEqual([]);
  });

  it('should accept a populated report', () => {
    const report = SyncReportSchema.parse({
      created: [{ entityId: 'e1', source: 'markdown' }],
      updated: [{ entityId: 'e2', field: 'status', source: 'beads' }],
      conflicts: [{ entityId: 'e3', field: 'content', winner: 'markdown', mdValue: 'a', beadValue: 'b' }],
      orphans: [{ entityId: 'e4', location: 'beads' }],
    });
    expect(report.created).toHaveLength(1);
    expect(report.conflicts[0].winner).toBe('markdown');
  });
});
```

- [ ] **Step 5: Run all tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: New tests FAIL, previous tests still PASS.

- [ ] **Step 6: Implement BeadLabel**

Create `tools/src/domain/value-objects/bead-label.ts`:

```typescript
import { z } from 'zod';

export const BeadLabelSchema = z.enum([
  'tff:project',
  'tff:milestone',
  'tff:slice',
  'tff:req',
  'tff:task',
  'tff:research',
]);

export type BeadLabel = z.infer<typeof BeadLabelSchema>;
```

- [ ] **Step 7: Implement CommitRef**

Create `tools/src/domain/value-objects/commit-ref.ts`:

```typescript
import { z } from 'zod';

export const CommitRefSchema = z.object({
  sha: z.string().min(7).max(40).regex(/^[a-f0-9]+$/),
  message: z.string().min(1),
});

export type CommitRef = z.infer<typeof CommitRefSchema>;
```

- [ ] **Step 8: Implement Wave**

Create `tools/src/domain/value-objects/wave.ts`:

```typescript
import { z } from 'zod';

export const WaveSchema = z.object({
  index: z.number().int().nonneg(),
  taskIds: z.array(z.string()).min(1),
});

export type Wave = z.infer<typeof WaveSchema>;
```

- [ ] **Step 9: Implement SyncReport**

Create `tools/src/domain/value-objects/sync-report.ts`:

```typescript
import { z } from 'zod';

export const SyncCreatedSchema = z.object({
  entityId: z.string(),
  source: z.enum(['markdown', 'beads']),
});

export const SyncUpdatedSchema = z.object({
  entityId: z.string(),
  field: z.string(),
  source: z.enum(['markdown', 'beads']),
});

export const SyncConflictSchema = z.object({
  entityId: z.string(),
  field: z.string(),
  winner: z.enum(['markdown', 'beads']),
  mdValue: z.string(),
  beadValue: z.string(),
});

export const SyncOrphanSchema = z.object({
  entityId: z.string(),
  location: z.enum(['markdown', 'beads']),
});

export const SyncReportSchema = z.object({
  created: z.array(SyncCreatedSchema),
  updated: z.array(SyncUpdatedSchema),
  conflicts: z.array(SyncConflictSchema),
  orphans: z.array(SyncOrphanSchema),
});

export type SyncReport = z.infer<typeof SyncReportSchema>;

export const emptySyncReport = (): SyncReport => ({
  created: [],
  updated: [],
  conflicts: [],
  orphans: [],
});
```

- [ ] **Step 10: Run all tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: All tests PASS.

- [ ] **Step 11: Commit**

```bash
git add tools/src/domain/value-objects/
git commit -m "feat: add BeadLabel, CommitRef, Wave, and SyncReport value objects"
```

---

### Task 8: Entity — Project (Aggregate Root)

**Files:**
- Create: `tools/src/domain/entities/project.ts`
- Create: `tools/src/domain/entities/project.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/entities/project.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createProject, ProjectSchema } from './project.js';

describe('Project', () => {
  it('should create a project with name and vision', () => {
    const project = createProject({ name: 'my-app', vision: 'A great app' });
    expect(project.name).toBe('my-app');
    expect(project.vision).toBe('A great app');
    expect(project.id).toBeDefined();
    expect(project.createdAt).toBeInstanceOf(Date);
  });

  it('should validate against schema', () => {
    const project = createProject({ name: 'test', vision: 'test vision' });
    expect(() => ProjectSchema.parse(project)).not.toThrow();
  });

  it('should reject empty name', () => {
    expect(() => createProject({ name: '', vision: 'v' })).toThrow();
  });

  it('should reject empty vision', () => {
    expect(() => createProject({ name: 'n', vision: '' })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/project.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Project entity**

Create `tools/src/domain/entities/project.ts`:

```typescript
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  vision: z.string().min(1),
  createdAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const createProject = (input: { name: string; vision: string }): Project => {
  const project = {
    id: crypto.randomUUID(),
    name: input.name,
    vision: input.vision,
    createdAt: new Date(),
  };
  return ProjectSchema.parse(project);
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/project.spec.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/entities/project.ts tools/src/domain/entities/project.spec.ts
git commit -m "feat: add Project aggregate root entity"
```

---

### Task 9: Entity — Milestone (Aggregate Root)

**Files:**
- Create: `tools/src/domain/entities/milestone.ts`
- Create: `tools/src/domain/entities/milestone.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/entities/milestone.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createMilestone,
  MilestoneSchema,
  formatMilestoneNumber,
} from './milestone.js';

describe('Milestone', () => {
  it('should create a milestone with name and project ID', () => {
    const ms = createMilestone({
      projectId: crypto.randomUUID(),
      name: 'MVP',
      number: 1,
    });
    expect(ms.name).toBe('MVP');
    expect(ms.number).toBe(1);
    expect(ms.status).toBe('open');
  });

  it('should format milestone number as M01', () => {
    expect(formatMilestoneNumber(1)).toBe('M01');
    expect(formatMilestoneNumber(12)).toBe('M12');
  });

  it('should validate against schema', () => {
    const ms = createMilestone({
      projectId: crypto.randomUUID(),
      name: 'Release',
      number: 2,
    });
    expect(() => MilestoneSchema.parse(ms)).not.toThrow();
  });

  it('should reject number less than 1', () => {
    expect(() =>
      createMilestone({
        projectId: crypto.randomUUID(),
        name: 'Bad',
        number: 0,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/milestone.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Milestone entity**

Create `tools/src/domain/entities/milestone.ts`:

```typescript
import { z } from 'zod';

export const MilestoneStatusSchema = z.enum(['open', 'in_progress', 'closed']);
export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>;

export const MilestoneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  number: z.number().int().min(1),
  status: MilestoneStatusSchema,
  createdAt: z.date(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

export const createMilestone = (input: {
  projectId: string;
  name: string;
  number: number;
}): Milestone => {
  const milestone = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    name: input.name,
    number: input.number,
    status: 'open' as const,
    createdAt: new Date(),
  };
  return MilestoneSchema.parse(milestone);
};

export const formatMilestoneNumber = (n: number): string =>
  `M${n.toString().padStart(2, '0')}`;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/milestone.spec.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/entities/milestone.ts tools/src/domain/entities/milestone.spec.ts
git commit -m "feat: add Milestone aggregate root entity"
```

---

### Task 10: Entity — Slice (Aggregate Root with State Machine)

**Files:**
- Create: `tools/src/domain/entities/slice.ts`
- Create: `tools/src/domain/entities/slice.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/entities/slice.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createSlice, transitionSlice, formatSliceId, SliceSchema } from './slice.js';
import { isOk, isErr } from '../result.js';

describe('Slice', () => {
  const makeSlice = () =>
    createSlice({
      milestoneId: crypto.randomUUID(),
      name: 'Auth flow',
      milestoneNumber: 1,
      sliceNumber: 1,
    });

  it('should create a slice in discussing status', () => {
    const slice = makeSlice();
    expect(slice.status).toBe('discussing');
    expect(slice.name).toBe('Auth flow');
  });

  it('should format slice ID as M01-S01', () => {
    expect(formatSliceId(1, 1)).toBe('M01-S01');
    expect(formatSliceId(2, 12)).toBe('M02-S12');
  });

  it('should validate against schema', () => {
    expect(() => SliceSchema.parse(makeSlice())).not.toThrow();
  });

  describe('transitionSlice', () => {
    it('should allow valid transition discussing → researching', () => {
      const slice = makeSlice();
      const result = transitionSlice(slice, 'researching');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.status).toBe('researching');
        expect(result.data.events).toHaveLength(1);
        expect(result.data.events[0].type).toBe('SLICE_STATUS_CHANGED');
      }
    });

    it('should reject invalid transition discussing → executing', () => {
      const slice = makeSlice();
      const result = transitionSlice(slice, 'executing');
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('INVALID_TRANSITION');
      }
    });

    it('should reject transition from closed', () => {
      const slice = { ...makeSlice(), status: 'closed' as const };
      const result = transitionSlice(slice, 'discussing');
      expect(isErr(result)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/slice.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Slice entity**

Create `tools/src/domain/entities/slice.ts`:

```typescript
import { z } from 'zod';
import { type Result, Ok, Err } from '../result.js';
import { SliceStatusSchema, canTransition, type SliceStatus } from '../value-objects/slice-status.js';
import { ComplexityTierSchema } from '../value-objects/complexity-tier.js';
import { type DomainError } from '../errors/domain-error.js';
import { invalidTransitionError } from '../errors/invalid-transition.error.js';
import { sliceStatusChangedEvent } from '../events/slice-status-changed.event.js';
import { type DomainEvent } from '../events/domain-event.js';

export const SliceSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
  name: z.string().min(1),
  sliceId: z.string(), // e.g. "M01-S01"
  status: SliceStatusSchema,
  tier: ComplexityTierSchema.optional(),
  createdAt: z.date(),
});

export type Slice = z.infer<typeof SliceSchema>;

export const createSlice = (input: {
  milestoneId: string;
  name: string;
  milestoneNumber: number;
  sliceNumber: number;
}): Slice => {
  const slice = {
    id: crypto.randomUUID(),
    milestoneId: input.milestoneId,
    name: input.name,
    sliceId: formatSliceId(input.milestoneNumber, input.sliceNumber),
    status: 'discussing' as const,
    createdAt: new Date(),
  };
  return SliceSchema.parse(slice);
};

export const formatSliceId = (milestoneNumber: number, sliceNumber: number): string =>
  `M${milestoneNumber.toString().padStart(2, '0')}-S${sliceNumber.toString().padStart(2, '0')}`;

export const transitionSlice = (
  slice: Slice,
  to: SliceStatus,
): Result<{ slice: Slice; events: DomainEvent[] }, DomainError> => {
  if (!canTransition(slice.status, to)) {
    return Err(invalidTransitionError(slice.sliceId, slice.status, to));
  }

  const updated: Slice = { ...slice, status: to };
  const event = sliceStatusChangedEvent(slice.sliceId, slice.status, to);

  return Ok({ slice: updated, events: [event] });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/slice.spec.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/entities/slice.ts tools/src/domain/entities/slice.spec.ts
git commit -m "feat: add Slice aggregate root with state machine transitions"
```

---

### Task 11: Entity — Task (Aggregate Root)

**Files:**
- Create: `tools/src/domain/entities/task.ts`
- Create: `tools/src/domain/entities/task.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/domain/entities/task.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTask, startTask, completeTask, TaskSchema } from './task.js';
import { isOk, isErr } from '../result.js';

describe('Task', () => {
  const makeTask = () =>
    createTask({
      sliceId: crypto.randomUUID(),
      sliceRef: 'M01-S01',
      name: 'Implement login',
      taskNumber: 3,
      description: 'Build the login form',
      acceptanceCriteria: ['Form renders', 'Validates email'],
    });

  it('should create a task with open status', () => {
    const task = makeTask();
    expect(task.status).toBe('open');
    expect(task.name).toBe('Implement login');
    expect(task.taskRef).toBe('T03');
  });

  it('should validate against schema', () => {
    expect(() => TaskSchema.parse(makeTask())).not.toThrow();
  });

  describe('startTask', () => {
    it('should transition open task to in_progress', () => {
      const task = makeTask();
      const result = startTask(task);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.status).toBe('in_progress');
      }
    });

    it('should reject starting an already in_progress task', () => {
      const task = { ...makeTask(), status: 'in_progress' as const };
      const result = startTask(task);
      expect(isErr(result)).toBe(true);
    });

    it('should reject starting a closed task', () => {
      const task = { ...makeTask(), status: 'closed' as const };
      const result = startTask(task);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('should mark an in_progress task as closed', () => {
      const task = { ...makeTask(), status: 'in_progress' as const };
      const result = completeTask(task, 'backend-dev');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.task.status).toBe('closed');
        expect(result.data.task.executor).toBe('backend-dev');
        expect(result.data.events[0].type).toBe('TASK_COMPLETED');
      }
    });

    it('should reject completing an open task', () => {
      const task = makeTask();
      const result = completeTask(task, 'backend-dev');
      expect(isErr(result)).toBe(true);
    });

    it('should reject completing a closed task', () => {
      const task = { ...makeTask(), status: 'closed' as const };
      const result = completeTask(task, 'backend-dev');
      expect(isErr(result)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/task.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement Task entity**

Create `tools/src/domain/entities/task.ts`:

```typescript
import { z } from 'zod';
import { type Result, Ok, Err } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';
import { createDomainError } from '../errors/domain-error.js';
import { taskCompletedEvent } from '../events/task-completed.event.js';
import { type DomainEvent } from '../events/domain-event.js';

export const TaskStatusSchema = z.enum(['open', 'in_progress', 'closed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  sliceId: z.string().uuid(),
  sliceRef: z.string(), // e.g. "M01-S01"
  name: z.string().min(1),
  taskRef: z.string(), // e.g. "T03"
  taskNumber: z.number().int().min(1),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  status: TaskStatusSchema,
  executor: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  createdAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const createTask = (input: {
  sliceId: string;
  sliceRef: string;
  name: string;
  taskNumber: number;
  description: string;
  acceptanceCriteria: string[];
  dependsOn?: string[];
}): Task => {
  const task = {
    id: crypto.randomUUID(),
    sliceId: input.sliceId,
    sliceRef: input.sliceRef,
    name: input.name,
    taskRef: `T${input.taskNumber.toString().padStart(2, '0')}`,
    taskNumber: input.taskNumber,
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    status: 'open' as const,
    dependsOn: input.dependsOn ?? [],
    createdAt: new Date(),
  };
  return TaskSchema.parse(task);
};

export const startTask = (
  task: Task,
): Result<Task, DomainError> => {
  if (task.status !== 'open') {
    return Err(
      createDomainError(
        'INVALID_TRANSITION',
        `Cannot start task "${task.taskRef}" — status is "${task.status}", expected "open"`,
        { taskRef: task.taskRef, status: task.status },
      ),
    );
  }

  return Ok({ ...task, status: 'in_progress' as const });
};

export const completeTask = (
  task: Task,
  executor: string,
): Result<{ task: Task; events: DomainEvent[] }, DomainError> => {
  if (task.status !== 'in_progress') {
    return Err(
      createDomainError(
        'INVALID_TRANSITION',
        `Cannot complete task "${task.taskRef}" — status is "${task.status}", expected "in_progress"`,
        { taskRef: task.taskRef, status: task.status },
      ),
    );
  }

  const updated: Task = { ...task, status: 'closed', executor };
  const event = taskCompletedEvent(task.id, task.sliceRef, executor);

  return Ok({ task: updated, events: [event] });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --config tools/vitest.config.ts tools/src/domain/entities/task.spec.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/entities/task.ts tools/src/domain/entities/task.spec.ts
git commit -m "feat: add Task aggregate root with start and completion logic"
```

---

### Task 12: Ports (Interfaces)

**Files:**
- Create: `tools/src/domain/ports/bead-store.port.ts`
- Create: `tools/src/domain/ports/artifact-store.port.ts`
- Create: `tools/src/domain/ports/git-ops.port.ts`
- Create: `tools/src/domain/ports/review-store.port.ts`

No spec files — these are pure interfaces. Tested via adapters and application services.

- [ ] **Step 1: Create BeadStore port**

Create `tools/src/domain/ports/bead-store.port.ts`:

```typescript
import { type Result } from '../result.js';
import { type BeadLabel } from '../value-objects/bead-label.js';
import { type DomainError } from '../errors/domain-error.js';

export interface BeadData {
  id: string;
  label: string;
  title: string;
  status: string;
  design?: string;
  parentId?: string;
  blocks?: string[];
  validates?: string[];
  metadata?: Record<string, string>;
}

export interface BeadStore {
  create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>>;

  get(id: string): Promise<Result<BeadData, DomainError>>;

  list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
  }): Promise<Result<BeadData[], DomainError>>;

  updateStatus(id: string, status: string): Promise<Result<void, DomainError>>;

  updateDesign(id: string, design: string): Promise<Result<void, DomainError>>;

  updateMetadata(
    id: string,
    key: string,
    value: string,
  ): Promise<Result<void, DomainError>>;

  addDependency(
    fromId: string,
    toId: string,
    type: 'blocks' | 'validates',
  ): Promise<Result<void, DomainError>>;

  close(id: string): Promise<Result<void, DomainError>>;
}
```

- [ ] **Step 2: Create ArtifactStore port**

Create `tools/src/domain/ports/artifact-store.port.ts`:

```typescript
import { type Result } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';

export interface ArtifactStore {
  read(path: string): Promise<Result<string, DomainError>>;

  write(path: string, content: string): Promise<Result<void, DomainError>>;

  exists(path: string): Promise<boolean>;

  list(directory: string): Promise<Result<string[], DomainError>>;

  mkdir(path: string): Promise<Result<void, DomainError>>;
}
```

- [ ] **Step 3: Create GitOps port**

Create `tools/src/domain/ports/git-ops.port.ts`:

```typescript
import { type Result } from '../result.js';
import { type CommitRef } from '../value-objects/commit-ref.js';
import { type DomainError } from '../errors/domain-error.js';

export interface GitOps {
  createBranch(name: string, from: string): Promise<Result<void, DomainError>>;

  createWorktree(
    path: string,
    branch: string,
  ): Promise<Result<void, DomainError>>;

  deleteWorktree(path: string): Promise<Result<void, DomainError>>;

  listWorktrees(): Promise<Result<string[], DomainError>>;

  commit(
    message: string,
    files: string[],
    worktreePath?: string,
  ): Promise<Result<CommitRef, DomainError>>;

  revert(
    commitSha: string,
    worktreePath?: string,
  ): Promise<Result<CommitRef, DomainError>>;

  merge(
    source: string,
    target: string,
  ): Promise<Result<void, DomainError>>;

  getCurrentBranch(
    worktreePath?: string,
  ): Promise<Result<string, DomainError>>;

  getHeadSha(
    worktreePath?: string,
  ): Promise<Result<string, DomainError>>;
}
```

- [ ] **Step 4: Create ReviewStore port**

Create `tools/src/domain/ports/review-store.port.ts`:

```typescript
import { type Result } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';

export interface ReviewRecord {
  sliceId: string;
  reviewerAgent: string;
  status: 'approved' | 'changes_requested';
  reviewedAt: Date;
}

export interface ReviewStore {
  record(review: ReviewRecord): Promise<Result<void, DomainError>>;

  getExecutorsForSlice(
    sliceId: string,
  ): Promise<Result<string[], DomainError>>;

  getReviewsForSlice(
    sliceId: string,
  ): Promise<Result<ReviewRecord[], DomainError>>;
}
```

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/ports/
git commit -m "feat: add domain ports for BeadStore, ArtifactStore, GitOps, ReviewStore"
```

---

### Task 13: Domain Barrel Export + Full Test Suite

**Files:**
- Create: `tools/src/domain/index.ts`

- [ ] **Step 1: Create barrel export**

Create `tools/src/domain/index.ts`:

```typescript
// Result
export { Ok, Err, isOk, isErr, match } from './result.js';
export type { Result, OkResult, ErrResult } from './result.js';

// Value Objects
export { ComplexityTierSchema, tierConfig } from './value-objects/complexity-tier.js';
export type { ComplexityTier, TierConfig } from './value-objects/complexity-tier.js';
export { SliceStatusSchema, canTransition, validTransitionsFrom } from './value-objects/slice-status.js';
export type { SliceStatus } from './value-objects/slice-status.js';
export { BeadLabelSchema } from './value-objects/bead-label.js';
export type { BeadLabel } from './value-objects/bead-label.js';
export { CommitRefSchema } from './value-objects/commit-ref.js';
export type { CommitRef } from './value-objects/commit-ref.js';
export { WaveSchema } from './value-objects/wave.js';
export type { Wave } from './value-objects/wave.js';
export { SyncReportSchema, emptySyncReport } from './value-objects/sync-report.js';
export type { SyncReport } from './value-objects/sync-report.js';

// Entities
export { ProjectSchema, createProject } from './entities/project.js';
export type { Project } from './entities/project.js';
export { MilestoneSchema, createMilestone, formatMilestoneNumber } from './entities/milestone.js';
export type { Milestone } from './entities/milestone.js';
export { SliceSchema, createSlice, transitionSlice, formatSliceId } from './entities/slice.js';
export type { Slice } from './entities/slice.js';
export { TaskSchema, createTask, startTask, completeTask } from './entities/task.js';
export type { Task } from './entities/task.js';

// Ports
export type { BeadStore, BeadData } from './ports/bead-store.port.js';
export type { ArtifactStore } from './ports/artifact-store.port.js';
export type { GitOps } from './ports/git-ops.port.js';
export type { ReviewStore, ReviewRecord } from './ports/review-store.port.js';

// Errors
export { DomainErrorSchema, createDomainError } from './errors/domain-error.js';
export type { DomainError, DomainErrorCode } from './errors/domain-error.js';
export { projectExistsError } from './errors/project-exists.error.js';
export { invalidTransitionError } from './errors/invalid-transition.error.js';
export { syncConflictError } from './errors/sync-conflict.error.js';
export { freshReviewerViolationError } from './errors/fresh-reviewer-violation.error.js';

// Events
export { createDomainEvent } from './events/domain-event.js';
export type { DomainEvent, DomainEventType } from './events/domain-event.js';
export { slicePlannedEvent } from './events/slice-planned.event.js';
export { sliceStatusChangedEvent } from './events/slice-status-changed.event.js';
export { taskCompletedEvent } from './events/task-completed.event.js';
export { syncConflictEvent } from './events/sync-conflict.event.js';
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: All tests PASS across all spec files.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit -p tools/tsconfig.json
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add tools/src/domain/index.ts
git commit -m "feat: add domain barrel export"
```

---

### Task 14: Verify Build

**Files:**
- Create: `tools/src/cli/index.ts` (minimal placeholder for tsup entry point)

- [ ] **Step 1: Create minimal CLI entry point**

Create `tools/src/cli/index.ts`:

```typescript
#!/usr/bin/env node

const [command] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') {
  console.log(JSON.stringify({
    ok: true,
    data: {
      name: 'tff-tools',
      version: '0.1.0',
      commands: ['project:init', 'project:get', 'milestone:create', 'milestone:list',
        'slice:create', 'slice:transition', 'slice:classify', 'waves:detect',
        'sync:reconcile', 'sync:state', 'worktree:create', 'worktree:delete',
        'worktree:list', 'review:record', 'review:check-fresh',
        'checkpoint:save', 'checkpoint:load'],
    },
  }));
} else {
  console.log(JSON.stringify({
    ok: false,
    error: { code: 'NOT_IMPLEMENTED', message: `Command "${command}" not yet implemented` },
  }));
}
```

- [ ] **Step 2: Build with tsup**

```bash
npx tsup
```

Expected: Creates `tools/dist/tff-tools.cjs`.

- [ ] **Step 3: Verify compiled binary works**

```bash
node tools/dist/tff-tools.cjs --help
```

Expected: JSON output listing available commands.

```bash
node tools/dist/tff-tools.cjs project:init
```

Expected: JSON error with `NOT_IMPLEMENTED`.

- [ ] **Step 4: Run full test suite one final time**

```bash
npx vitest run --config tools/vitest.config.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/src/cli/index.ts tools/dist/tff-tools.cjs
git commit -m "feat: add minimal CLI entry point and verify build pipeline"
```
