import { describe, it, expect, beforeEach } from 'vitest';
import { saveCheckpoint } from './save-checkpoint.js';
import { loadCheckpoint } from './load-checkpoint.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('checkpoint', () => {
  let artifactStore: InMemoryArtifactStore;
  beforeEach(() => { artifactStore = new InMemoryArtifactStore(); });

  const checkpointData = {
    sliceId: 'M01-S01', baseCommit: 'abc1234', currentWave: 2,
    completedWaves: [0, 1], completedTasks: ['T01', 'T02', 'T03'],
    executorLog: [
      { taskRef: 'T01', agent: 'backend-dev' },
      { taskRef: 'T02', agent: 'frontend-dev' },
      { taskRef: 'T03', agent: 'backend-dev' },
    ],
  };

  it('should save checkpoint as CHECKPOINT.md', async () => {
    const result = await saveCheckpoint(checkpointData, { artifactStore });
    expect(isOk(result)).toBe(true);
    expect(await artifactStore.exists('.tff/milestones/M01/slices/M01-S01/CHECKPOINT.md')).toBe(true);
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
