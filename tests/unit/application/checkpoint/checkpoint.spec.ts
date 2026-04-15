import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../src/../src/domain/result.js';
import { InMemoryArtifactStore } from '../../src/../src/infrastructure/testing/in-memory-artifact-store.js';
import { loadCheckpoint } from '../../../src/application/checkpoint/load-checkpoint.js';
import { saveCheckpoint } from '../../../src/application/checkpoint/save-checkpoint.js';

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

  it('should return Err when artifact write fails', async () => {
    artifactStore.simulateWriteFailure('.tff/milestones/M01/slices/M01-S01/CHECKPOINT.md');
    const result = await saveCheckpoint(checkpointData, { artifactStore });
    expect(isOk(result)).toBe(false);
  });

  describe('incremental checkpoint', () => {
    it('should preserve accumulated completedTasks across saves', async () => {
      const initial = {
        sliceId: 'M01-S01',
        baseCommit: 'abc1234',
        currentWave: 1,
        completedWaves: [0],
        completedTasks: ['T01', 'T02'],
        executorLog: [
          { taskRef: 'T01', agent: 'dev' },
          { taskRef: 'T02', agent: 'dev' },
        ],
      };
      await saveCheckpoint(initial, { artifactStore });

      const updated = {
        ...initial,
        completedTasks: ['T01', 'T02', 'T03'],
        executorLog: [...initial.executorLog, { taskRef: 'T03', agent: 'dev' }],
      };
      await saveCheckpoint(updated, { artifactStore });

      const result = await loadCheckpoint('M01-S01', { artifactStore });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.completedTasks).toEqual(['T01', 'T02', 'T03']);
      }
    });

    it('should load partially completed wave for resume', async () => {
      const data = {
        sliceId: 'M01-S01',
        baseCommit: 'abc1234',
        currentWave: 1,
        completedWaves: [0],
        completedTasks: ['T01', 'T02', 'T03'],
        executorLog: [
          { taskRef: 'T01', agent: 'dev' },
          { taskRef: 'T02', agent: 'dev' },
          { taskRef: 'T03', agent: 'dev' },
        ],
      };
      await saveCheckpoint(data, { artifactStore });

      const result = await loadCheckpoint('M01-S01', { artifactStore });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.completedWaves).toEqual([0]);
        expect(result.data.currentWave).toBe(1);
        expect(result.data.completedTasks).toContain('T03');
      }
    });
  });
});
