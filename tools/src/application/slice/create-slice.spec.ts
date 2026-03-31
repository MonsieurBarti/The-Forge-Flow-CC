import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { createSliceUseCase } from './create-slice.js';

describe('createSliceUseCase', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a slice with bead and markdown', async () => {
    const result = await createSliceUseCase(
      { milestoneBeadId: '00000000-0000-4000-8000-000000000002', title: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
      { beadStore, artifactStore },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.slice.title).toBe('Auth');
      expect(result.data.slice.id).toBe('M01-S01');
      expect(result.data.slice.status).toBe('discussing');
    }
  });

  it('should create slice directory', async () => {
    await createSliceUseCase(
      { milestoneBeadId: '00000000-0000-4000-8000-000000000002', title: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
      { beadStore, artifactStore },
    );

    expect(await artifactStore.exists('.tff/milestones/M01/slices/M01-S01/PLAN.md')).toBe(true);
  });
});
