import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';
import { getProject } from './get-project.js';

describe('getProject', () => {
  let adapter: InMemoryStateAdapter;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
  });

  it('should return project data when project exists', async () => {
    adapter.saveProject({ name: 'my-app' });

    const result = await getProject({ projectStore: adapter });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data?.name).toBe('my-app');
    }
  });

  it('should return null when no project exists', async () => {
    const result = await getProject({ projectStore: adapter });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toBeNull();
    }
  });
});
