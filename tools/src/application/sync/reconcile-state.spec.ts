import { describe, it, expect, beforeEach } from 'vitest';
import {
  reconcileState,
  resolveContentConflict,
  resolveStatusConflict,
  detectOrphans,
} from './reconcile-state.js';
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

  it('should prefer bead status when both exist and differ', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' },
      { id: 's1', label: 'tff:slice', title: 'Auth', status: 'executing', design: 'Auth design', parentId: 'ms1' },
    ]);
    artifactStore.seed({
      '.tff/slices/Auth/PLAN.md': 'Auth design',
    });

    const result = await reconcileState(
      { milestoneId: 'ms1', milestoneName: 'MVP' },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const statusUpdate = result.data.updated.find((u) => u.field === 'status');
      expect(statusUpdate).toBeDefined();
      expect(statusUpdate?.source).toBe('beads');
    }
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

describe('resolveContentConflict', () => {
  it('should prefer markdown content over bead design', () => {
    expect(resolveContentConflict('markdown content', 'bead design')).toBe('markdown content');
  });
  it('should return bead design when markdown is empty', () => {
    expect(resolveContentConflict('', 'bead design')).toBe('bead design');
  });
});

describe('resolveStatusConflict', () => {
  it('should prefer bead status over markdown status', () => {
    expect(resolveStatusConflict('planning', 'executing')).toBe('executing');
  });
});

describe('detectOrphans', () => {
  it('should find markdown-only entities', () => {
    const orphans = detectOrphans(['M01-S01', 'M01-S02', 'M01-S03'], ['M01-S01', 'M01-S02']);
    expect(orphans.markdownOnly).toEqual(['M01-S03']);
    expect(orphans.beadOnly).toEqual([]);
  });
  it('should find bead-only entities', () => {
    const orphans = detectOrphans(['M01-S01'], ['M01-S01', 'M01-S02']);
    expect(orphans.markdownOnly).toEqual([]);
    expect(orphans.beadOnly).toEqual(['M01-S02']);
  });
});
