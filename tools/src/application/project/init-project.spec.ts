import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../domain/result.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';
import { initProject } from './init-project.js';

describe('initProject', () => {
  let adapter: InMemoryStateAdapter;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a project when none exists', async () => {
    const result = await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.project.name).toBe('my-app');
      expect(result.data.project.vision).toBe('A great app');
    }
  });

  it('should create PROJECT.md artifact', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    expect(await artifactStore.exists('.tff/PROJECT.md')).toBe(true);
  });

  it('should reject if project already exists', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    const result = await initProject({ name: 'another', vision: 'Nope' }, { projectStore: adapter, artifactStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('PROJECT_EXISTS');
  });

  it('should reject if PROJECT.md already exists', async () => {
    artifactStore.seed({ '.tff/PROJECT.md': '# Existing' });
    const result = await initProject({ name: 'my-app', vision: 'Vision' }, { projectStore: adapter, artifactStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('PROJECT_EXISTS');
  });
});
