import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../result.js';
import { JournalEntryBuilder } from '../value-objects/journal-entry.builder.js';
import type { JournalRepository } from './journal-repository.port.js';

export function runJournalContractTests(
  name: string,
  factory: () => JournalRepository & { reset(): void },
) {
  describe(`${name} contract`, () => {
    let repo: JournalRepository & { reset(): void };
    const sliceId = crypto.randomUUID();
    const builder = new JournalEntryBuilder().withSliceId(sliceId);

    beforeEach(() => {
      repo = factory();
      repo.reset();
    });

    it('append assigns monotonic seq starting at 0 (AC2)', () => {
      const r0 = repo.append(sliceId, builder.buildTaskStarted());
      expect(isOk(r0) && r0.data).toBe(0);
      const r1 = repo.append(sliceId, builder.buildTaskCompleted());
      expect(isOk(r1) && r1.data).toBe(1);
      const r2 = repo.append(sliceId, builder.buildPhaseChanged());
      expect(isOk(r2) && r2.data).toBe(2);
    });

    it('readAll returns entries in seq order (AC2)', () => {
      repo.append(sliceId, builder.buildTaskStarted());
      repo.append(sliceId, builder.buildTaskCompleted());
      repo.append(sliceId, builder.buildPhaseChanged());
      const result = repo.readAll(sliceId);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].seq).toBe(0);
        expect(result.data[1].seq).toBe(1);
        expect(result.data[2].seq).toBe(2);
      }
    });

    it('readSince filters entries after specified seq (AC9)', () => {
      for (let i = 0; i < 10; i++) {
        repo.append(sliceId, builder.buildTaskStarted());
      }
      const result = repo.readSince(sliceId, 5);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(4);
        expect(result.data[0].seq).toBe(6);
        expect(result.data[3].seq).toBe(9);
      }
    });

    it('count matches appended entries', () => {
      repo.append(sliceId, builder.buildTaskStarted());
      repo.append(sliceId, builder.buildTaskCompleted());
      const result = repo.count(sliceId);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toBe(2);
    });

    it('readAll returns empty for unknown slice', () => {
      const result = repo.readAll(crypto.randomUUID());
      expect(isOk(result)).toBe(true);
      if (isOk(result)) expect(result.data).toHaveLength(0);
    });
  });
}
