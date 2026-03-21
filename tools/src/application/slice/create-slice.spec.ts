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
      { milestoneBeadId: '00000000-0000-4000-8000-000000000002', name: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
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
      { milestoneBeadId: '00000000-0000-4000-8000-000000000002', name: 'Auth', milestoneNumber: 1, sliceNumber: 1 },
      { beadStore, artifactStore },
    );

    expect(await artifactStore.exists('.tff/slices/M01-S01/PLAN.md')).toBe(true);
  });
});
