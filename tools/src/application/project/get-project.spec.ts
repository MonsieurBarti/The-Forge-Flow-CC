import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { getProject } from './get-project.js';

describe('getProject', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should return project data when project exists', async () => {
    beadStore.seed([
      {
        id: 'proj-1',
        label: 'tff:project',
        title: 'my-app',
        status: 'open',
        design: 'A great app',
      },
    ]);
    artifactStore.seed({ '.tff/PROJECT.md': '# my-app\n\n## Vision\n\nA great app\n' });

    const result = await getProject({ beadStore, artifactStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.title).toBe('my-app');
      expect(result.data.design).toBe('A great app');
    }
  });

  it('should return error when no project exists', async () => {
    const result = await getProject({ beadStore, artifactStore });
    expect(isErr(result)).toBe(true);
  });
});
