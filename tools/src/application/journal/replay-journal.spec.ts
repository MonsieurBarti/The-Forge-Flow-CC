import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { JournalEntryBuilder } from '../../domain/value-objects/journal-entry.builder.js';
import type { JournalEntry } from '../../domain/value-objects/journal-entry.js';
import { InMemoryJournalAdapter } from '../../infrastructure/testing/in-memory-journal.adapter.js';
import { replayJournal } from './replay-journal.js';

describe('replayJournal', () => {
  const sliceId = 'M01-S04';
  const builder = new JournalEntryBuilder().withSliceId(sliceId);

  it('consistent journal + checkpoint → OK (AC3)', () => {
    const journal = new InMemoryJournalAdapter();
    const entries: JournalEntry[] = [
      { ...builder.buildTaskCompleted({ taskId: 'T01' }), seq: 0 } as JournalEntry,
      { ...builder.buildCheckpointSaved({ waveIndex: 0, completedTaskCount: 1 }), seq: 1 } as JournalEntry,
    ];
    journal.seed(sliceId, entries);

    const result = replayJournal({ sliceId, checkpoint: { completedTasks: ['T01'], currentWave: 1 } }, { journal });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.consistent).toBe(true);
      expect(result.data.completedTaskIds).toContain('T01');
      expect(result.data.resumeFromWave).toBe(1);
    }
  });

  it('checkpoint claims task not in journal → REJECT (AC3)', () => {
    const journal = new InMemoryJournalAdapter();
    journal.seed(sliceId, [{ ...builder.buildPhaseChanged(), seq: 0 } as JournalEntry]);

    const result = replayJournal({ sliceId, checkpoint: { completedTasks: ['T01'], currentWave: 0 } }, { journal });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('JOURNAL_REPLAY_INCONSISTENT');
  });

  it('empty journal + empty checkpoint → OK, resume from 0 (AC4)', () => {
    const journal = new InMemoryJournalAdapter();

    const result = replayJournal({ sliceId, checkpoint: { completedTasks: [], currentWave: 0 } }, { journal });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.consistent).toBe(true);
      expect(result.data.resumeFromWave).toBe(0);
    }
  });

  it('empty journal + non-empty checkpoint → REJECT (AC3)', () => {
    const journal = new InMemoryJournalAdapter();

    const result = replayJournal({ sliceId, checkpoint: { completedTasks: ['T01'], currentWave: 1 } }, { journal });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('JOURNAL_REPLAY_INCONSISTENT');
  });

  it('uses highest checkpoint-saved wave for resume (AC4)', () => {
    const journal = new InMemoryJournalAdapter();
    const entries: JournalEntry[] = [
      { ...builder.buildTaskCompleted({ taskId: 'T01' }), seq: 0 } as JournalEntry,
      { ...builder.buildCheckpointSaved({ waveIndex: 0 }), seq: 1 } as JournalEntry,
      { ...builder.buildTaskCompleted({ taskId: 'T02' }), seq: 2 } as JournalEntry,
      { ...builder.buildCheckpointSaved({ waveIndex: 1 }), seq: 3 } as JournalEntry,
    ];
    journal.seed(sliceId, entries);

    const result = replayJournal(
      { sliceId, checkpoint: { completedTasks: ['T01', 'T02'], currentWave: 2 } },
      { journal },
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.data.resumeFromWave).toBe(2);
  });
});
