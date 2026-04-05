import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { JournalEntryBuilder } from '../../domain/value-objects/journal-entry.builder.js';
import type { JournalEntry } from '../../domain/value-objects/journal-entry.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryJournalAdapter } from '../../infrastructure/testing/in-memory-journal.adapter.js';
import { type CheckpointData, saveCheckpoint } from '../checkpoint/save-checkpoint.js';
import { type ResumeInput, resumeSlice } from './resume-slice.js';

describe('resumeSlice', () => {
  let artifactStore: InMemoryArtifactStore;
  let journal: InMemoryJournalAdapter;
  const sliceId = 'M01-S01';
  const builder = new JournalEntryBuilder().withSliceId(sliceId);

  beforeEach(() => {
    artifactStore = new InMemoryArtifactStore();
    journal = new InMemoryJournalAdapter();
  });

  const createCheckpoint = (overrides?: Partial<CheckpointData>): CheckpointData => ({
    sliceId,
    baseCommit: 'abc1234',
    currentWave: 2,
    completedWaves: [0, 1],
    completedTasks: ['T01', 'T02', 'T03'],
    executorLog: [
      { taskRef: 'T01', agent: 'backend-dev' },
      { taskRef: 'T02', agent: 'frontend-dev' },
      { taskRef: 'T03', agent: 'backend-dev' },
    ],
    ...overrides,
  });

  describe('happy path', () => {
    it('should resume from checkpoint with consistent journal', async () => {
      // Seed journal with entries matching checkpoint
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T02', waveIndex: 0 }), seq: 1 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T03', waveIndex: 1 }), seq: 2 } as JournalEntry,
        { ...builder.buildCheckpointSaved({ waveIndex: 1, completedTaskCount: 3 }), seq: 3 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      // Save checkpoint
      const checkpoint = createCheckpoint();
      await saveCheckpoint(checkpoint, { artifactStore });

      // Resume
      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.consistent).toBe(true);
        expect(result.data.resumeFromWave).toBe(2);
        expect(result.data.completedTaskIds).toContain('T01');
        expect(result.data.completedTaskIds).toContain('T02');
        expect(result.data.completedTaskIds).toContain('T03');
        expect(result.data.skipTasks).toEqual(result.data.completedTaskIds);
        expect(result.data.checkpoint.sliceId).toBe(sliceId);
        expect(result.data.lastProcessedSeq).toBe(3);
      }
    });

    it('should determine resume wave based on highest checkpoint-saved entry', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
        { ...builder.buildCheckpointSaved({ waveIndex: 0, completedTaskCount: 1 }), seq: 1 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T02', waveIndex: 1 }), seq: 2 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T03', waveIndex: 1 }), seq: 3 } as JournalEntry,
        { ...builder.buildCheckpointSaved({ waveIndex: 1, completedTaskCount: 2 }), seq: 4 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      const checkpoint = createCheckpoint({ currentWave: 2, completedTasks: ['T01', 'T02', 'T03'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Should resume from wave after highest checkpoint-saved (1 + 1 = 2)
        expect(result.data.resumeFromWave).toBe(2);
      }
    });

    it('should handle empty journal with empty checkpoint (fresh start)', async () => {
      // No journal entries seeded - empty journal
      const checkpoint = createCheckpoint({
        currentWave: 0,
        completedWaves: [],
        completedTasks: [],
        executorLog: [],
      });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.consistent).toBe(true);
        expect(result.data.resumeFromWave).toBe(0);
        expect(result.data.completedTaskIds).toEqual([]);
        expect(result.data.skipTasks).toEqual([]);
      }
    });
  });

  describe('error cases', () => {
    it('should return error when no checkpoint exists', async () => {
      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toContain('No checkpoint found');
        expect(result.error.context).toMatchObject({ sliceId, reason: 'no-checkpoint' });
      }
    });

    it('should return error when journal is empty but checkpoint has completed tasks', async () => {
      // Empty journal (no entries seeded)
      const checkpoint = createCheckpoint({ completedTasks: ['T01'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('JOURNAL_REPLAY_INCONSISTENT');
        expect(result.error.message).toContain('Journal is empty but checkpoint has completed tasks');
      }
    });

    it('should return error when checkpoint claims task not in journal', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      // Checkpoint claims T02 was completed but journal only has T01
      const checkpoint = createCheckpoint({ completedTasks: ['T01', 'T02'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('JOURNAL_REPLAY_INCONSISTENT');
        expect(result.error.message).toContain('T02');
        expect(result.error.context).toMatchObject({ reason: 'missing-task-completed', taskId: 'T02' });
      }
    });

    it('should return error when checkpoint and journal are inconsistent', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T02', waveIndex: 0 }), seq: 1 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      // Checkpoint says 3 tasks completed, journal only has 2
      const checkpoint = createCheckpoint({ completedTasks: ['T01', 'T02', 'T03'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe('JOURNAL_REPLAY_INCONSISTENT');
        expect(result.error.context).toMatchObject({ reason: 'missing-task-completed', taskId: 'T03' });
      }
    });
  });

  describe('resume decision specifics', () => {
    it('should include checkpoint data in result for downstream use', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      const checkpoint = createCheckpoint({
        baseCommit: 'def5678',
        currentWave: 1,
        completedWaves: [0],
        completedTasks: ['T01'],
      });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.checkpoint.baseCommit).toBe('def5678');
        expect(result.data.checkpoint.currentWave).toBe(1);
        expect(result.data.checkpoint.completedWaves).toEqual([0]);
      }
    });

    it('should initialize nextTasks as empty array (caller must populate)', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      const checkpoint = createCheckpoint({ completedTasks: ['T01'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.nextTasks).toEqual([]);
      }
    });

    it('should track lastProcessedSeq from journal replay', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T02', waveIndex: 0 }), seq: 1 } as JournalEntry,
        { ...builder.buildCheckpointSaved({ waveIndex: 0, completedTaskCount: 2 }), seq: 2 } as JournalEntry,
        { ...builder.buildTaskCompleted({ taskId: 'T03', waveIndex: 1 }), seq: 3 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      const checkpoint = createCheckpoint({ completedTasks: ['T01', 'T02', 'T03'] });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.lastProcessedSeq).toBe(3);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle checkpoint with no completed waves', async () => {
      const entries: JournalEntry[] = [
        { ...builder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
      ];
      journal.seed(sliceId, entries);

      const checkpoint = createCheckpoint({
        currentWave: 0,
        completedWaves: [],
        completedTasks: ['T01'],
      });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.resumeFromWave).toBe(0);
      }
    });

    it('should handle sliceId with different milestone format', async () => {
      const altSliceId = 'M002-S03';
      const altBuilder = new JournalEntryBuilder().withSliceId(altSliceId);

      const entries: JournalEntry[] = [
        { ...altBuilder.buildTaskCompleted({ taskId: 'T01', waveIndex: 0 }), seq: 0 } as JournalEntry,
      ];
      journal.seed(altSliceId, entries);

      const checkpoint = createCheckpoint({
        sliceId: altSliceId,
        completedTasks: ['T01'],
      });
      await saveCheckpoint(checkpoint, { artifactStore });

      const input: ResumeInput = { sliceId: altSliceId };
      const result = await resumeSlice(input, { artifactStore, journal });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.checkpoint.sliceId).toBe(altSliceId);
      }
    });
  });
});
