# Plan 7a: Skill Auto-Learn — Foundation (Domain + Application + Hook)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TypeScript foundation for the skill auto-learn pipeline: domain value objects, application services for observation recording, n-gram extraction, pattern aggregation, candidate ranking, cluster detection, drift checking, and skill validation. Plus the bash observation hook and CLI commands.

**Architecture:** Follows existing hexagonal pattern. Domain value objects (Zod schemas) for Observation, Pattern, Candidate. Application services for each pipeline stage. JSONL adapter for observation storage. Bash hook for PostToolUse capture. All tested with Vitest.

**Tech Stack:** TypeScript, Zod v4, Vitest, Bash (hook), jq (hook JSON parsing)

**Spec:** `docs/superpowers/specs/2026-03-21-skill-auto-learn-design.md`

---

## File Structure

```
tools/src/
  domain/value-objects/
    observation.ts + spec
    pattern.ts + spec
    candidate.ts + spec

  application/
    observe/
      record-observation.ts + spec
    patterns/
      extract-ngrams.ts + spec
      aggregate-patterns.ts + spec
      rank-candidates.ts + spec
    compose/
      detect-clusters.ts + spec
    skills/
      check-drift.ts + spec
      validate-skill.ts + spec

  infrastructure/
    adapters/
      jsonl/
        jsonl-store.adapter.ts + spec
    testing/
      in-memory-observation-store.ts

  cli/commands/
    observe-record.cmd.ts
    patterns-extract.cmd.ts
    patterns-aggregate.cmd.ts
    patterns-rank.cmd.ts
    compose-detect.cmd.ts
    skills-drift.cmd.ts
    skills-validate.cmd.ts

hooks/
  tff-observe.sh
  hooks.json
```

---

### Task 1: Domain Value Objects (Observation, Pattern, Candidate)

**Files:**
- Create: `tools/src/domain/value-objects/observation.ts`
- Create: `tools/src/domain/value-objects/observation.spec.ts`
- Create: `tools/src/domain/value-objects/pattern.ts`
- Create: `tools/src/domain/value-objects/pattern.spec.ts`
- Create: `tools/src/domain/value-objects/candidate.ts`
- Create: `tools/src/domain/value-objects/candidate.spec.ts`

- [ ] **Step 1: Write failing tests for Observation**

Create `tools/src/domain/value-objects/observation.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ObservationSchema, type Observation } from './observation.js';

describe('Observation', () => {
  it('should accept a valid observation', () => {
    const obs = ObservationSchema.parse({
      ts: '2026-03-21T14:30:00Z',
      session: 'abc123',
      tool: 'Bash',
      args: 'npm test',
      project: '/path/to/project',
    });
    expect(obs.tool).toBe('Bash');
  });

  it('should accept null args', () => {
    const obs = ObservationSchema.parse({
      ts: '2026-03-21T14:30:00Z',
      session: 'abc123',
      tool: 'Read',
      args: null,
      project: '/path/to/project',
    });
    expect(obs.args).toBeNull();
  });

  it('should reject missing tool', () => {
    expect(() => ObservationSchema.parse({
      ts: '2026-03-21T14:30:00Z',
      session: 'abc123',
      project: '/path/to/project',
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/monsieurbarti/Projects/The-Forge-Flow-CC/tools && npx vitest run src/domain/value-objects/observation.spec.ts
```

- [ ] **Step 3: Implement Observation**

Create `tools/src/domain/value-objects/observation.ts`:

```typescript
import { z } from 'zod';

export const ObservationSchema = z.object({
  ts: z.string(),
  session: z.string(),
  tool: z.string().min(1),
  args: z.string().nullable(),
  project: z.string(),
});

export type Observation = z.infer<typeof ObservationSchema>;
```

- [ ] **Step 4: Write failing tests for Pattern**

Create `tools/src/domain/value-objects/pattern.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { PatternSchema } from './pattern.js';

describe('Pattern', () => {
  it('should accept a valid pattern', () => {
    const p = PatternSchema.parse({
      sequence: ['Read', 'Grep', 'Edit'],
      count: 12,
      sessions: 8,
      projects: 3,
      lastSeen: '2026-03-21',
    });
    expect(p.sequence).toHaveLength(3);
    expect(p.count).toBe(12);
  });

  it('should reject empty sequence', () => {
    expect(() => PatternSchema.parse({
      sequence: [],
      count: 1,
      sessions: 1,
      projects: 1,
      lastSeen: '2026-03-21',
    })).toThrow();
  });

  it('should reject zero count', () => {
    expect(() => PatternSchema.parse({
      sequence: ['Read'],
      count: 0,
      sessions: 1,
      projects: 1,
      lastSeen: '2026-03-21',
    })).toThrow();
  });
});
```

- [ ] **Step 5: Implement Pattern**

Create `tools/src/domain/value-objects/pattern.ts`:

```typescript
import { z } from 'zod';

export const PatternSchema = z.object({
  sequence: z.array(z.string()).min(1),
  count: z.number().int().min(1),
  sessions: z.number().int().min(1),
  projects: z.number().int().min(1),
  lastSeen: z.string(),
});

export type Pattern = z.infer<typeof PatternSchema>;
```

- [ ] **Step 6: Write failing tests for Candidate**

Create `tools/src/domain/value-objects/candidate.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CandidateSchema } from './candidate.js';

describe('Candidate', () => {
  it('should accept a valid candidate', () => {
    const c = CandidateSchema.parse({
      pattern: ['Read', 'Grep', 'Edit', 'Bash(npm test)'],
      score: 0.78,
      evidence: { count: 12, sessions: 8, projects: 3 },
    });
    expect(c.score).toBe(0.78);
  });

  it('should reject score above 1', () => {
    expect(() => CandidateSchema.parse({
      pattern: ['Read'],
      score: 1.5,
      evidence: { count: 1, sessions: 1, projects: 1 },
    })).toThrow();
  });

  it('should reject negative score', () => {
    expect(() => CandidateSchema.parse({
      pattern: ['Read'],
      score: -0.1,
      evidence: { count: 1, sessions: 1, projects: 1 },
    })).toThrow();
  });
});
```

- [ ] **Step 7: Implement Candidate**

Create `tools/src/domain/value-objects/candidate.ts`:

```typescript
import { z } from 'zod';

export const CandidateEvidenceSchema = z.object({
  count: z.number().int().min(1),
  sessions: z.number().int().min(1),
  projects: z.number().int().min(1),
});

export const CandidateSchema = z.object({
  pattern: z.array(z.string()).min(1),
  score: z.number().min(0).max(1),
  evidence: CandidateEvidenceSchema,
});

export type Candidate = z.infer<typeof CandidateSchema>;
export type CandidateEvidence = z.infer<typeof CandidateEvidenceSchema>;
```

- [ ] **Step 8: Run all tests, type check**

```bash
cd tools && npx vitest run
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 9: Commit**

```bash
git add tools/src/domain/value-objects/observation.ts tools/src/domain/value-objects/observation.spec.ts tools/src/domain/value-objects/pattern.ts tools/src/domain/value-objects/pattern.spec.ts tools/src/domain/value-objects/candidate.ts tools/src/domain/value-objects/candidate.spec.ts
git commit -m "feat: add Observation, Pattern, Candidate value objects for skill auto-learn"
```

---

### Task 2: Observation Store Port + In-Memory + JSONL Adapters

**Files:**
- Create: `tools/src/domain/ports/observation-store.port.ts`
- Create: `tools/src/infrastructure/testing/in-memory-observation-store.ts`
- Create: `tools/src/infrastructure/adapters/jsonl/jsonl-store.adapter.ts`
- Create: `tools/src/infrastructure/adapters/jsonl/jsonl-store.adapter.spec.ts`

- [ ] **Step 1: Create ObservationStore port**

Create `tools/src/domain/ports/observation-store.port.ts`:

```typescript
import { type Result } from '../result.js';
import { type DomainError } from '../errors/domain-error.js';
import { type Observation } from '../value-objects/observation.js';
import { type Pattern } from '../value-objects/pattern.js';
import { type Candidate } from '../value-objects/candidate.js';

export interface ObservationStore {
  appendObservation(obs: Observation): Promise<Result<void, DomainError>>;
  readObservations(): Promise<Result<Observation[], DomainError>>;
  writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>>;
  readPatterns(): Promise<Result<Pattern[], DomainError>>;
  writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>>;
  readCandidates(): Promise<Result<Candidate[], DomainError>>;
}
```

- [ ] **Step 2: Create InMemoryObservationStore**

Create `tools/src/infrastructure/testing/in-memory-observation-store.ts`:

```typescript
import { type ObservationStore } from '../../domain/ports/observation-store.port.js';
import { type Observation } from '../../domain/value-objects/observation.js';
import { type Pattern } from '../../domain/value-objects/pattern.js';
import { type Candidate } from '../../domain/value-objects/candidate.js';
import { type Result, Ok } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';

export class InMemoryObservationStore implements ObservationStore {
  private observations: Observation[] = [];
  private patterns: Pattern[] = [];
  private candidates: Candidate[] = [];

  async appendObservation(obs: Observation): Promise<Result<void, DomainError>> {
    this.observations.push(obs);
    return Ok(undefined);
  }

  async readObservations(): Promise<Result<Observation[], DomainError>> {
    return Ok([...this.observations]);
  }

  async writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>> {
    this.patterns = patterns;
    return Ok(undefined);
  }

  async readPatterns(): Promise<Result<Pattern[], DomainError>> {
    return Ok([...this.patterns]);
  }

  async writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>> {
    this.candidates = candidates;
    return Ok(undefined);
  }

  async readCandidates(): Promise<Result<Candidate[], DomainError>> {
    return Ok([...this.candidates]);
  }

  reset(): void {
    this.observations = [];
    this.patterns = [];
    this.candidates = [];
  }
}
```

- [ ] **Step 3: Write failing test for JSONL adapter**

Create `tools/src/infrastructure/adapters/jsonl/jsonl-store.adapter.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonlStoreAdapter } from './jsonl-store.adapter.js';
import { isOk } from '../../../domain/result.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('JsonlStoreAdapter', () => {
  let adapter: JsonlStoreAdapter;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tff-jsonl-'));
    adapter = new JsonlStoreAdapter(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should append and read observations', async () => {
    await adapter.appendObservation({
      ts: '2026-03-21T14:30:00Z',
      session: 's1',
      tool: 'Bash',
      args: 'npm test',
      project: '/p',
    });
    await adapter.appendObservation({
      ts: '2026-03-21T14:30:05Z',
      session: 's1',
      tool: 'Edit',
      args: null,
      project: '/p',
    });

    const result = await adapter.readObservations();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].tool).toBe('Bash');
    }
  });

  it('should write and read patterns', async () => {
    await adapter.writePatterns([
      { sequence: ['Read', 'Edit'], count: 5, sessions: 3, projects: 2, lastSeen: '2026-03-21' },
    ]);

    const result = await adapter.readPatterns();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('should return empty array when no file exists', async () => {
    const result = await adapter.readObservations();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 4: Implement JSONL adapter**

Create `tools/src/infrastructure/adapters/jsonl/jsonl-store.adapter.ts`:

```typescript
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { type ObservationStore } from '../../../domain/ports/observation-store.port.js';
import { type Observation } from '../../../domain/value-objects/observation.js';
import { type Pattern } from '../../../domain/value-objects/pattern.js';
import { type Candidate } from '../../../domain/value-objects/candidate.js';
import { type Result, Ok } from '../../../domain/result.js';
import { type DomainError } from '../../../domain/errors/domain-error.js';

export class JsonlStoreAdapter implements ObservationStore {
  private readonly sessionsPath: string;
  private readonly patternsPath: string;
  private readonly candidatesPath: string;

  constructor(basePath: string) {
    this.sessionsPath = join(basePath, 'sessions.jsonl');
    this.patternsPath = join(basePath, 'patterns.jsonl');
    this.candidatesPath = join(basePath, 'candidates.jsonl');
  }

  async appendObservation(obs: Observation): Promise<Result<void, DomainError>> {
    await mkdir(join(this.sessionsPath, '..'), { recursive: true });
    await appendFile(this.sessionsPath, JSON.stringify(obs) + '\n');
    return Ok(undefined);
  }

  async readObservations(): Promise<Result<Observation[], DomainError>> {
    return this.readJsonl<Observation>(this.sessionsPath);
  }

  async writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>> {
    return this.writeJsonl(this.patternsPath, patterns);
  }

  async readPatterns(): Promise<Result<Pattern[], DomainError>> {
    return this.readJsonl<Pattern>(this.patternsPath);
  }

  async writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>> {
    return this.writeJsonl(this.candidatesPath, candidates);
  }

  async readCandidates(): Promise<Result<Candidate[], DomainError>> {
    return this.readJsonl<Candidate>(this.candidatesPath);
  }

  private async readJsonl<T>(path: string): Promise<Result<T[], DomainError>> {
    try {
      const content = await readFile(path, 'utf-8');
      const lines = content.trim().split('\n').filter((l) => l.length > 0);
      return Ok(lines.map((l) => JSON.parse(l) as T));
    } catch {
      return Ok([]);
    }
  }

  private async writeJsonl<T>(path: string, items: T[]): Promise<Result<void, DomainError>> {
    await mkdir(join(path, '..'), { recursive: true });
    const content = items.map((i) => JSON.stringify(i)).join('\n') + '\n';
    await writeFile(path, content);
    return Ok(undefined);
  }
}
```

- [ ] **Step 5: Run tests, type check, commit**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
git add tools/src/domain/ports/observation-store.port.ts tools/src/infrastructure/testing/in-memory-observation-store.ts tools/src/infrastructure/adapters/jsonl/
git commit -m "feat: add ObservationStore port with JSONL and in-memory adapters"
```

---

### Task 3: Extract N-grams Service

**Files:**
- Create: `tools/src/application/patterns/extract-ngrams.ts`
- Create: `tools/src/application/patterns/extract-ngrams.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/patterns/extract-ngrams.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractNgrams } from './extract-ngrams.js';
import { type Observation } from '../../domain/value-objects/observation.js';

describe('extractNgrams', () => {
  const obs: Observation[] = [
    { ts: '1', session: 's1', tool: 'Read', args: null, project: '/p1' },
    { ts: '2', session: 's1', tool: 'Grep', args: null, project: '/p1' },
    { ts: '3', session: 's1', tool: 'Edit', args: null, project: '/p1' },
    { ts: '4', session: 's1', tool: 'Bash', args: 'npm test', project: '/p1' },
    { ts: '5', session: 's2', tool: 'Read', args: null, project: '/p2' },
    { ts: '6', session: 's2', tool: 'Grep', args: null, project: '/p2' },
    { ts: '7', session: 's2', tool: 'Edit', args: null, project: '/p2' },
  ];

  it('should extract bigrams', () => {
    const result = extractNgrams(obs, 2);
    const keys = result.map((r) => r.sequence.join('→'));
    expect(keys).toContain('Read→Grep');
    expect(keys).toContain('Grep→Edit');
  });

  it('should extract trigrams', () => {
    const result = extractNgrams(obs, 3);
    const keys = result.map((r) => r.sequence.join('→'));
    expect(keys).toContain('Read→Grep→Edit');
  });

  it('should not cross session boundaries', () => {
    const result = extractNgrams(obs, 2);
    const keys = result.map((r) => r.sequence.join('→'));
    // Bash(s1) → Read(s2) should NOT exist as a bigram
    expect(keys).not.toContain('Bash→Read');
  });

  it('should track project distribution', () => {
    const result = extractNgrams(obs, 2);
    const readGrep = result.find((r) => r.sequence.join('→') === 'Read→Grep');
    expect(readGrep).toBeDefined();
    expect(readGrep!.projects).toBe(2);
  });

  it('should count occurrences across sessions', () => {
    const result = extractNgrams(obs, 2);
    const readGrep = result.find((r) => r.sequence.join('→') === 'Read→Grep');
    expect(readGrep!.count).toBe(2);
    expect(readGrep!.sessions).toBe(2);
  });

  it('should return empty for empty input', () => {
    expect(extractNgrams([], 2)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement extractNgrams**

Create `tools/src/application/patterns/extract-ngrams.ts`:

```typescript
import { type Observation } from '../../domain/value-objects/observation.js';
import { type Pattern } from '../../domain/value-objects/pattern.js';

export const extractNgrams = (observations: Observation[], n: number): Pattern[] => {
  if (observations.length < n) return [];

  // Group observations by session
  const sessions = new Map<string, Observation[]>();
  for (const obs of observations) {
    const list = sessions.get(obs.session) ?? [];
    list.push(obs);
    sessions.set(obs.session, list);
  }

  // Extract n-grams per session, track counts
  const ngramMap = new Map<string, {
    sequence: string[];
    count: number;
    sessionSet: Set<string>;
    projectSet: Set<string>;
    lastSeen: string;
  }>();

  for (const [sessionId, sessionObs] of sessions) {
    for (let i = 0; i <= sessionObs.length - n; i++) {
      const sequence = sessionObs.slice(i, i + n).map((o) => o.tool);
      const key = sequence.join('→');

      const existing = ngramMap.get(key);
      const lastTs = sessionObs[i + n - 1].ts;

      if (existing) {
        existing.count++;
        existing.sessionSet.add(sessionId);
        existing.projectSet.add(sessionObs[i].project);
        if (lastTs > existing.lastSeen) existing.lastSeen = lastTs;
      } else {
        ngramMap.set(key, {
          sequence,
          count: 1,
          sessionSet: new Set([sessionId]),
          projectSet: new Set([sessionObs[i].project]),
          lastSeen: lastTs,
        });
      }
    }
  }

  return [...ngramMap.values()].map((v) => ({
    sequence: v.sequence,
    count: v.count,
    sessions: v.sessionSet.size,
    projects: v.projectSet.size,
    lastSeen: v.lastSeen,
  }));
};
```

- [ ] **Step 4: Run tests, type check, commit**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
git add tools/src/application/patterns/extract-ngrams.ts tools/src/application/patterns/extract-ngrams.spec.ts
git commit -m "feat: add extractNgrams for tool sequence pattern extraction"
```

---

### Task 4: Aggregate Patterns Service

**Files:**
- Create: `tools/src/application/patterns/aggregate-patterns.ts`
- Create: `tools/src/application/patterns/aggregate-patterns.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/patterns/aggregate-patterns.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { aggregatePatterns } from './aggregate-patterns.js';
import { type Pattern } from '../../domain/value-objects/pattern.js';

describe('aggregatePatterns', () => {
  it('should filter patterns below minimum count', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 2, sessions: 2, projects: 1, lastSeen: '2026-03-21' },
      { sequence: ['Grep', 'Edit'], count: 5, sessions: 4, projects: 2, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toEqual(['Grep', 'Edit']);
  });

  it('should filter framework noise (patterns in 80%+ sessions)', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Read'], count: 50, sessions: 45, projects: 5, lastSeen: '2026-03-21' },
      { sequence: ['Read', 'Edit'], count: 10, sessions: 8, projects: 3, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3, totalSessions: 50, noiseThreshold: 0.8 });
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toEqual(['Read', 'Edit']);
  });

  it('should pass through patterns meeting all criteria', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Grep', 'Edit'], count: 12, sessions: 8, projects: 3, lastSeen: '2026-03-21' },
    ];
    const result = aggregatePatterns(patterns, { minCount: 3, totalSessions: 20, noiseThreshold: 0.8 });
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement aggregatePatterns**

Create `tools/src/application/patterns/aggregate-patterns.ts`:

```typescript
import { type Pattern } from '../../domain/value-objects/pattern.js';

interface AggregateOptions {
  minCount?: number;
  totalSessions?: number;
  noiseThreshold?: number;
}

export const aggregatePatterns = (
  patterns: Pattern[],
  options: AggregateOptions = {},
): Pattern[] => {
  const minCount = options.minCount ?? 3;
  const totalSessions = options.totalSessions ?? 0;
  const noiseThreshold = options.noiseThreshold ?? 0.8;

  return patterns.filter((p) => {
    // Filter below minimum count
    if (p.count < minCount) return false;

    // Filter framework noise
    if (totalSessions > 0 && p.sessions / totalSessions >= noiseThreshold) return false;

    return true;
  });
};
```

- [ ] **Step 3: Run tests, type check, commit**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
git add tools/src/application/patterns/aggregate-patterns.ts tools/src/application/patterns/aggregate-patterns.spec.ts
git commit -m "feat: add aggregatePatterns with noise filtering and minimum count"
```

---

### Task 5: Rank Candidates Service

**Files:**
- Create: `tools/src/application/patterns/rank-candidates.ts`
- Create: `tools/src/application/patterns/rank-candidates.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `tools/src/application/patterns/rank-candidates.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { rankCandidates } from './rank-candidates.js';
import { type Pattern } from '../../domain/value-objects/pattern.js';

describe('rankCandidates', () => {
  const now = '2026-03-21';

  it('should score candidates between 0 and 1', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 10, sessions: 5, projects: 3, lastSeen: now },
    ];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(1);
  });

  it('should rank high-frequency cross-project patterns higher', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 20, sessions: 15, projects: 5, lastSeen: now },
      { sequence: ['Grep', 'Bash'], count: 3, sessions: 2, projects: 1, lastSeen: now },
    ];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should penalize old patterns via recency decay', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 10, sessions: 5, projects: 3, lastSeen: now },
      { sequence: ['Grep', 'Bash'], count: 10, sessions: 5, projects: 3, lastSeen: '2026-01-01' },
    ];
    const result = rankCandidates(patterns, { totalProjects: 5, totalSessions: 20, now });
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it('should filter below threshold', () => {
    const patterns: Pattern[] = [
      { sequence: ['Read', 'Edit'], count: 1, sessions: 1, projects: 1, lastSeen: now },
    ];
    const result = rankCandidates(patterns, { totalProjects: 10, totalSessions: 50, now, threshold: 0.5 });
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement rankCandidates**

Create `tools/src/application/patterns/rank-candidates.ts`:

```typescript
import { type Pattern } from '../../domain/value-objects/pattern.js';
import { type Candidate } from '../../domain/value-objects/candidate.js';

interface RankOptions {
  totalProjects: number;
  totalSessions: number;
  now: string;
  threshold?: number;
}

export const rankCandidates = (
  patterns: Pattern[],
  options: RankOptions,
): Candidate[] => {
  const threshold = options.threshold ?? 0;
  const nowMs = new Date(options.now).getTime();
  const halfLifeMs = 14 * 24 * 60 * 60 * 1000; // 14 days

  const scored = patterns.map((p) => {
    const frequency = Math.min(Math.log2(p.count + 1) / 10, 1.0);
    const breadth = options.totalProjects > 0 ? p.projects / options.totalProjects : 0;
    const ageDays = (nowMs - new Date(p.lastSeen).getTime()) / (24 * 60 * 60 * 1000);
    const recency = Math.exp(-ageDays * Math.LN2 / 14);
    const consistency = options.totalSessions > 0 ? p.sessions / options.totalSessions : 0;

    const score = frequency * 0.25 + breadth * 0.30 + recency * 0.25 + consistency * 0.20;

    return {
      pattern: p.sequence,
      score: Math.round(score * 100) / 100,
      evidence: { count: p.count, sessions: p.sessions, projects: p.projects },
    };
  });

  return scored
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score);
};
```

- [ ] **Step 3: Run tests, type check, commit**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
git add tools/src/application/patterns/rank-candidates.ts tools/src/application/patterns/rank-candidates.spec.ts
git commit -m "feat: add rankCandidates with weighted scoring (frequency, breadth, recency, consistency)"
```

---

### Task 6: Detect Clusters + Check Drift + Validate Skill Services

**Pre-requisite:** Add `'VALIDATION_ERROR'` to `DomainErrorCodeSchema` in `tools/src/domain/errors/domain-error.ts` before implementing `validateSkill`.

**Files:**
- Create: `tools/src/application/compose/detect-clusters.ts`
- Create: `tools/src/application/compose/detect-clusters.spec.ts`
- Create: `tools/src/application/skills/check-drift.ts`
- Create: `tools/src/application/skills/check-drift.spec.ts`
- Create: `tools/src/application/skills/validate-skill.ts`
- Create: `tools/src/application/skills/validate-skill.spec.ts`

- [ ] **Step 1: Write failing tests for detectClusters**

Create `tools/src/application/compose/detect-clusters.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectClusters } from './detect-clusters.js';

describe('detectClusters', () => {
  it('should detect skills that co-activate above threshold', () => {
    const coActivations = [
      { skills: ['hexagonal-architecture', 'commit-conventions', 'tdd'], sessions: 17 },
      { skills: ['hexagonal-architecture', 'commit-conventions'], sessions: 18 },
      { skills: ['code-review-checklist'], sessions: 10 },
    ];
    const result = detectClusters(coActivations, { totalSessions: 20, threshold: 0.7 });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].skills).toContain('hexagonal-architecture');
    expect(result[0].skills).toContain('commit-conventions');
  });

  it('should not cluster skills below threshold', () => {
    const coActivations = [
      { skills: ['a', 'b'], sessions: 3 },
    ];
    const result = detectClusters(coActivations, { totalSessions: 20, threshold: 0.7 });
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement detectClusters**

Create `tools/src/application/compose/detect-clusters.ts`:

```typescript
interface CoActivation {
  skills: string[];
  sessions: number;
}

interface ClusterOptions {
  totalSessions: number;
  threshold?: number;
}

export interface SkillCluster {
  skills: string[];
  coActivationRate: number;
  sessions: number;
}

export const detectClusters = (
  coActivations: CoActivation[],
  options: ClusterOptions,
): SkillCluster[] => {
  const threshold = options.threshold ?? 0.7;

  return coActivations
    .filter((ca) => ca.skills.length >= 2)
    .map((ca) => ({
      skills: ca.skills.sort(),
      coActivationRate: options.totalSessions > 0 ? ca.sessions / options.totalSessions : 0,
      sessions: ca.sessions,
    }))
    .filter((c) => c.coActivationRate >= threshold)
    .sort((a, b) => b.coActivationRate - a.coActivationRate);
};
```

- [ ] **Step 3: Write failing tests for checkDrift**

Create `tools/src/application/skills/check-drift.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { checkDrift } from './check-drift.js';

describe('checkDrift', () => {
  it('should return 0 drift when content is identical', () => {
    const result = checkDrift('original content', 'original content');
    expect(result.driftScore).toBe(0);
    expect(result.overThreshold).toBe(false);
  });

  it('should detect drift when content changes', () => {
    const original = 'a'.repeat(100);
    const current = 'b'.repeat(30) + 'a'.repeat(70);
    const result = checkDrift(original, current);
    expect(result.driftScore).toBeGreaterThan(0);
  });

  it('should flag when drift exceeds threshold', () => {
    const original = 'a'.repeat(100);
    const current = 'b'.repeat(70) + 'a'.repeat(30);
    const result = checkDrift(original, current, { maxDrift: 0.6 });
    expect(result.overThreshold).toBe(true);
  });
});
```

- [ ] **Step 4: Implement checkDrift**

Create `tools/src/application/skills/check-drift.ts`:

```typescript
interface DriftOptions {
  maxDrift?: number;
}

interface DriftResult {
  driftScore: number;
  overThreshold: boolean;
}

export const checkDrift = (
  original: string,
  current: string,
  options: DriftOptions = {},
): DriftResult => {
  const maxDrift = options.maxDrift ?? 0.6;

  if (original === current) return { driftScore: 0, overThreshold: false };

  // Simple character-level diff ratio
  const maxLen = Math.max(original.length, current.length);
  if (maxLen === 0) return { driftScore: 0, overThreshold: false };

  let changes = 0;
  for (let i = 0; i < maxLen; i++) {
    if (original[i] !== current[i]) changes++;
  }

  const driftScore = Math.round((changes / maxLen) * 100) / 100;
  return { driftScore, overThreshold: driftScore > maxDrift };
};
```

- [ ] **Step 5: Write failing tests for validateSkill**

Create `tools/src/application/skills/validate-skill.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateSkill } from './validate-skill.js';
import { isOk, isErr } from '../../domain/result.js';

describe('validateSkill', () => {
  it('should accept a valid skill', () => {
    const result = validateSkill({
      name: 'tdd-workflow',
      description: 'Use when implementing features with TDD',
      content: '# TDD Workflow\n\n## When to Use\n...',
    });
    expect(isOk(result)).toBe(true);
  });

  it('should reject invalid name (uppercase)', () => {
    const result = validateSkill({
      name: 'TDD-Workflow',
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });

  it('should reject name with consecutive hyphens', () => {
    const result = validateSkill({
      name: 'tdd--workflow',
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });

  it('should warn if description lacks activation trigger', () => {
    const result = validateSkill({
      name: 'my-skill',
      description: 'A nice skill for things',
      content: '# content',
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.warnings).toContain('Description should start with "Use when"');
    }
  });

  it('should reject name longer than 64 chars', () => {
    const result = validateSkill({
      name: 'a'.repeat(65),
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });
});
```

- [ ] **Step 6: Implement validateSkill**

Create `tools/src/application/skills/validate-skill.ts`:

```typescript
import { type Result, Ok, Err } from '../../domain/result.js';
import { type DomainError, createDomainError } from '../../domain/errors/domain-error.js';

interface SkillInput {
  name: string;
  description: string;
  content: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const validateSkill = (
  input: SkillInput,
): Result<ValidationResult, DomainError> => {
  const warnings: string[] = [];

  // Name validation
  if (input.name.length === 0 || input.name.length > 64) {
    return Err(createDomainError('VALIDATION_ERROR', `Skill name must be 1-64 characters, got ${input.name.length}`));
  }

  if (!NAME_REGEX.test(input.name)) {
    return Err(createDomainError('VALIDATION_ERROR', `Skill name "${input.name}" must be lowercase letters, numbers, and single hyphens only`));
  }

  if (input.name.includes('--')) {
    return Err(createDomainError('VALIDATION_ERROR', 'Skill name must not contain consecutive hyphens'));
  }

  // Description quality
  if (!input.description.toLowerCase().startsWith('use when')) {
    warnings.push('Description should start with "Use when"');
  }

  return Ok({ valid: true, warnings });
};
```

- [ ] **Step 7: Run all tests, type check, commit**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
git add tools/src/application/compose/ tools/src/application/skills/
git commit -m "feat: add detectClusters, checkDrift, and validateSkill services"
```

---

### Task 7: CLI Commands + Router Update

**Files:**
- Create: 7 CLI command files in `tools/src/cli/commands/`
- Modify: `tools/src/cli/index.ts`
- Modify: `tools/src/application/index.ts`

- [ ] **Step 1: Create all 7 CLI commands**

Each command follows the same pattern: parse args, instantiate adapter, call service, output JSON.

Create `tools/src/cli/commands/observe-record.cmd.ts`:
```typescript
import { type Observation, ObservationSchema } from '../../domain/value-objects/observation.js';
import { JsonlStoreAdapter } from '../../infrastructure/adapters/jsonl/jsonl-store.adapter.js';
import { isOk } from '../../domain/result.js';

export const observeRecordCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: observe:record <json>' } });
  try {
    const obs = ObservationSchema.parse(JSON.parse(input));
    const store = new JsonlStoreAdapter('.tff/observations');
    const result = await store.appendObservation(obs);
    if (isOk(result)) return JSON.stringify({ ok: true, data: null });
    return JSON.stringify({ ok: false, error: result.error });
  } catch (e) {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: String(e) } });
  }
};
```

Create `tools/src/cli/commands/patterns-extract.cmd.ts`:
```typescript
import { extractNgrams } from '../../application/patterns/extract-ngrams.js';
import { JsonlStoreAdapter } from '../../infrastructure/adapters/jsonl/jsonl-store.adapter.js';
import { isOk } from '../../domain/result.js';

export const patternsExtractCmd = async (_args: string[]): Promise<string> => {
  const store = new JsonlStoreAdapter('.tff/observations');
  const obsResult = await store.readObservations();
  if (!isOk(obsResult)) return JSON.stringify({ ok: false, error: obsResult.error });
  const bigrams = extractNgrams(obsResult.data, 2);
  const trigrams = extractNgrams(obsResult.data, 3);
  const all = [...bigrams, ...trigrams];
  // Persist extracted patterns so aggregate can read them
  await store.writePatterns(all);
  return JSON.stringify({ ok: true, data: all });
};
```

Create `tools/src/cli/commands/patterns-aggregate.cmd.ts`:
```typescript
import { aggregatePatterns } from '../../application/patterns/aggregate-patterns.js';
import { JsonlStoreAdapter } from '../../infrastructure/adapters/jsonl/jsonl-store.adapter.js';
import { isOk } from '../../domain/result.js';

export const patternsAggregateCmd = async (args: string[]): Promise<string> => {
  const store = new JsonlStoreAdapter('.tff/observations');
  const patternsResult = await store.readPatterns();
  if (!isOk(patternsResult)) return JSON.stringify({ ok: false, error: patternsResult.error });
  const minCount = parseInt(args[0] ?? '3', 10);
  const result = aggregatePatterns(patternsResult.data, { minCount });
  await store.writePatterns(result);
  return JSON.stringify({ ok: true, data: result });
};
```

Create `tools/src/cli/commands/patterns-rank.cmd.ts`:
```typescript
import { rankCandidates } from '../../application/patterns/rank-candidates.js';
import { JsonlStoreAdapter } from '../../infrastructure/adapters/jsonl/jsonl-store.adapter.js';
import { isOk } from '../../domain/result.js';

export const patternsRankCmd = async (args: string[]): Promise<string> => {
  const store = new JsonlStoreAdapter('.tff/observations');
  const patternsResult = await store.readPatterns();
  if (!isOk(patternsResult)) return JSON.stringify({ ok: false, error: patternsResult.error });
  const obsResult = await store.readObservations();
  const totalSessions = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.session)).size : 1;
  const totalProjects = isOk(obsResult) ? new Set(obsResult.data.map((o) => o.project)).size : 1;
  const threshold = parseFloat(args[0] ?? '0.5');
  const candidates = rankCandidates(patternsResult.data, {
    totalProjects, totalSessions, now: new Date().toISOString().slice(0, 10), threshold,
  });
  await store.writeCandidates(candidates);
  return JSON.stringify({ ok: true, data: candidates });
};
```

Create `tools/src/cli/commands/compose-detect.cmd.ts`:
```typescript
import { detectClusters } from '../../application/compose/detect-clusters.js';

export const composeDetectCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: compose:detect <co-activations-json>' } });
  try {
    const data = JSON.parse(input);
    const totalSessions = parseInt(args[1] ?? '20', 10);
    const result = detectClusters(data, { totalSessions });
    return JSON.stringify({ ok: true, data: result });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON' } });
  }
};
```

Create `tools/src/cli/commands/skills-drift.cmd.ts`:
```typescript
import { checkDrift } from '../../application/skills/check-drift.js';

export const skillsDriftCmd = async (args: string[]): Promise<string> => {
  const [original, current] = args;
  if (!original || !current) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: skills:drift <original-content> <current-content>' } });
  const result = checkDrift(original, current);
  return JSON.stringify({ ok: true, data: result });
};
```

Create `tools/src/cli/commands/skills-validate.cmd.ts`:
```typescript
import { validateSkill } from '../../application/skills/validate-skill.js';
import { isOk } from '../../domain/result.js';

export const skillsValidateCmd = async (args: string[]): Promise<string> => {
  const input = args[0];
  if (!input) return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Usage: skills:validate <json>' } });
  try {
    const data = JSON.parse(input);
    const result = validateSkill(data);
    if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
    return JSON.stringify({ ok: false, error: result.error });
  } catch {
    return JSON.stringify({ ok: false, error: { code: 'INVALID_ARGS', message: 'Invalid JSON' } });
  }
};
```

- [ ] **Step 2: Update CLI router**

Add all 7 new imports and commands to `tools/src/cli/index.ts`.

- [ ] **Step 3: Update application barrel**

Add new exports to `tools/src/application/index.ts`.

- [ ] **Step 4: Run tests, type check, rebuild**

```bash
cd tools && npx vitest run && npx tsc --noEmit -p tsconfig.json
cd .. && npm run build
```

- [ ] **Step 5: Verify CLI**

```bash
node tools/dist/tff-tools.cjs --help
node tools/dist/tff-tools.cjs skills:validate '{"name":"tdd-workflow","description":"Use when doing TDD","content":"# TDD"}'
```

- [ ] **Step 6: Commit**

```bash
git add tools/src/cli/ tools/src/application/index.ts tools/dist/tff-tools.cjs
git commit -m "feat: add 7 CLI commands for skill auto-learn pipeline"
```

---

### Task 8: Observation Hook (Bash)

**Files:**
- Create: `hooks/tff-observe.sh`
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Create the bash hook**

Create `hooks/tff-observe.sh`:

```bash
#!/bin/bash
# tff observation hook — appends tool use to sessions.jsonl
# Exit 0 always. Never block. Never fail visibly.

# Check if observation is enabled (fast path: skip if no settings or disabled)
SETTINGS=".tff/settings.yaml"
if [ ! -f "$SETTINGS" ] || ! grep -q "enabled: true" "$SETTINGS" 2>/dev/null; then
  exit 0
fi

# Read hook event from stdin
INPUT=$(cat)
if [ -z "$INPUT" ]; then
  exit 0
fi

# Extract fields and append to JSONL
TOOL=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
ARGS=$(echo "$INPUT" | jq -r '.tool_input.command // .tool_input.file_path // empty')
SESSION=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p .tff/observations
echo "{\"ts\":\"$TS\",\"session\":\"$SESSION\",\"tool\":\"$TOOL\",\"args\":\"$ARGS\",\"project\":\"$(pwd)\"}" >> .tff/observations/sessions.jsonl

# Suppress output so it doesn't clutter the conversation
echo '{"suppressOutput":true}'
exit 0
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x hooks/tff-observe.sh
```

- [ ] **Step 3: Update hooks.json**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "hooks/tff-observe.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/tff-observe.sh hooks/hooks.json
git commit -m "feat: add bash observation hook for PostToolUse capture"
```

---

### Task 9: Update Domain Barrel + Final Verification

**Files:**
- Modify: `tools/src/domain/index.ts`

- [ ] **Step 1: Add new exports to domain barrel**

Add to `tools/src/domain/index.ts`:

```typescript
// Observation pipeline value objects
export { ObservationSchema } from './value-objects/observation.js';
export type { Observation } from './value-objects/observation.js';
export { PatternSchema } from './value-objects/pattern.js';
export type { Pattern } from './value-objects/pattern.js';
export { CandidateSchema, CandidateEvidenceSchema } from './value-objects/candidate.js';
export type { Candidate, CandidateEvidence } from './value-objects/candidate.js';

// Observation store port
export type { ObservationStore } from './ports/observation-store.port.js';
```

- [ ] **Step 2: Run full test suite**

```bash
cd tools && npx vitest run
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 4: Rebuild and verify**

```bash
cd .. && npm run build
node tools/dist/tff-tools.cjs --help
```

- [ ] **Step 5: Commit**

```bash
git add tools/src/domain/index.ts
git commit -m "feat: add skill auto-learn exports to domain barrel"
```
