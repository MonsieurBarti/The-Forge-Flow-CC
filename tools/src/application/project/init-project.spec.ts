import { describe, it, expect, beforeEach } from 'vitest';
import { initProject } from './init-project.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { isOk, isErr } from '../../domain/result.js';

describe('initProject', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a project when none exists', async () => {
    const result = await initProject({ name: 'my-app', vision: 'A great app' }, { beadStore, artifactStore });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.project.name).toBe('my-app');
      expect(result.data.project.vision).toBe('A great app');
    }
  });

  it('should create PROJECT.md artifact', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { beadStore, artifactStore });
    expect(await artifactStore.exists('.tff/PROJECT.md')).toBe(true);
  });

  it('should create a tff:project bead', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { beadStore, artifactStore });
    const beads = await beadStore.list({ label: 'tff:project' });
    expect(isOk(beads) && beads.data.length).toBe(1);
  });

  it('should reject if project bead already exists', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { beadStore, artifactStore });
    const result = await initProject({ name: 'another', vision: 'Nope' }, { beadStore, artifactStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('PROJECT_EXISTS');
  });

  it('should reject if PROJECT.md already exists', async () => {
    artifactStore.seed({ '.tff/PROJECT.md': '# Existing' });
    const result = await initProject({ name: 'my-app', vision: 'Vision' }, { beadStore, artifactStore });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.code).toBe('PROJECT_EXISTS');
  });
});
