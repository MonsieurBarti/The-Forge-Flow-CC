import { describe, it, expect, beforeEach } from 'vitest';
import { reconcileState } from './reconcile-state.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk } from '../../domain/result.js';

describe('reconcileState', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should generate markdown for beads without markdown', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
      { id: 's1', label: 'tff:slice', title: 'Auth', status: 'open', design: 'Auth system design', parentId: 'ms1' },
    ]);

    const result = await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toHaveLength(1);
      expect(result.data.created[0].source).toBe('beads');
    }
    expect(await artifactStore.exists('.tff/slices/Auth/PLAN.md')).toBe(true);
  });

  it('should create beads for markdown without beads', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
    ]);
    artifactStore.seed({
      '.tff/slices/NewSlice/PLAN.md': '# Plan — NewSlice\n\nNew slice content\n',
    });

    const result = await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toHaveLength(1);
      expect(result.data.created[0].source).toBe('markdown');
    }
  });

  it('should update bead design when markdown content differs', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
      { id: 's1', label: 'tff:slice', title: 'Auth', status: 'open', design: 'Old design', parentId: 'ms1' },
    ]);
    artifactStore.seed({
      '.tff/slices/Auth/PLAN.md': '# Updated plan content',
    });

    const result = await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.updated).toHaveLength(1);
      expect(result.data.updated[0].field).toBe('design');
      expect(result.data.updated[0].source).toBe('markdown');
    }
  });

  it('should regenerate STATE.md', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
    ]);

    await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(await artifactStore.exists('.tff/STATE.md')).toBe(true);
  });

  it('should return empty report when everything is in sync', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
    ]);

    const result = await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.created).toHaveLength(0);
      expect(result.data.updated).toHaveLength(0);
      expect(result.data.conflicts).toHaveLength(0);
      expect(result.data.orphans).toHaveLength(0);
    }
  });
});
