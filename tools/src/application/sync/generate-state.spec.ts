import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { generateState } from './generate-state.js';

describe('generateState', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;
  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should generate STATE.md with slice progress', async () => {
    beadStore.seed([
      { id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'in_progress' },
      { id: 's1', label: 'tff:slice', title: 'Auth', status: 'closed', parentId: 'ms1' },
      { id: 's2', label: 'tff:slice', title: 'Billing', status: 'executing', parentId: 'ms1' },
      { id: 't1', label: 'tff:task', title: 'Login', status: 'closed', parentId: 's1' },
      { id: 't2', label: 'tff:task', title: 'Signup', status: 'closed', parentId: 's1' },
      { id: 't3', label: 'tff:task', title: 'Payment', status: 'in_progress', parentId: 's2' },
      { id: 't4', label: 'tff:task', title: 'Invoice', status: 'open', parentId: 's2' },
    ]);
    const result = await generateState({ milestoneId: 'ms1', milestoneName: 'MVP' }, { beadStore, artifactStore });
    expect(isOk(result)).toBe(true);
    const content = await artifactStore.read('.tff/STATE.md');
    expect(isOk(content)).toBe(true);
    if (isOk(content)) {
      expect(content.data).toContain('# State — MVP');
      expect(content.data).toContain('Auth');
      expect(content.data).toContain('Billing');
    }
  });

  it('should handle empty milestone', async () => {
    beadStore.seed([{ id: 'ms1', label: 'tff:milestone', title: 'MVP', status: 'open' }]);
    const result = await generateState({ milestoneId: 'ms1', milestoneName: 'MVP' }, { beadStore, artifactStore });
    expect(isOk(result)).toBe(true);
  });
});
