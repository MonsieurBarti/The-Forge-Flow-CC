import { describe, it, expect, beforeEach } from 'vitest';
import { listMilestones } from './list-milestones.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { isOk } from '../../domain/result.js';

describe('listMilestones', () => {
  let beadStore: InMemoryBeadStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
  });

  it('should return all milestones', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'closed' },
      { id: 'ms2', label: 'tff:milestone', title: 'v2', status: 'open' },
    ]);

    const result = await listMilestones({ beadStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return empty array when no milestones', async () => {
    const result = await listMilestones({ beadStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
