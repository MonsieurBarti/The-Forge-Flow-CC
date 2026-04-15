import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';
import { listMilestones } from './list-milestones.js';

describe('listMilestones', () => {
  let adapter: InMemoryStateAdapter;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    adapter.init();
  });

  it('should return all milestones', async () => {
    adapter.createMilestone({ number: 1, name: 'MVP' });
    adapter.createMilestone({ number: 2, name: 'v2' });

    const result = await listMilestones({ milestoneStore: adapter });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return empty array when no milestones', async () => {
    const result = await listMilestones({ milestoneStore: adapter });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
