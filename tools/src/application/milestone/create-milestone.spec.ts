import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { InMemoryStateAdapter } from '../../infrastructure/testing/in-memory-state-adapter.js';
import { createMilestoneUseCase } from './create-milestone.js';

describe('createMilestoneUseCase', () => {
  let adapter: InMemoryStateAdapter;
  let artifactStore: InMemoryArtifactStore;
  let gitOps: InMemoryGitOps;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    adapter.init();
    artifactStore = new InMemoryArtifactStore();
    gitOps = new InMemoryGitOps();
    adapter.saveProject({ name: 'app', vision: 'A great app' });
  });

  it('should create a milestone with branch', async () => {
    const result = await createMilestoneUseCase(
      { name: 'MVP', number: 1 },
      { milestoneStore: adapter, artifactStore, gitOps },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.milestone.name).toBe('MVP');
      expect(result.data.milestone.number).toBe(1);
      expect(gitOps.hasBranch('milestone/M01')).toBe(true);
    }
  });

  it('should create REQUIREMENTS.md stub', async () => {
    await createMilestoneUseCase({ name: 'MVP', number: 1 }, { milestoneStore: adapter, artifactStore, gitOps });

    expect(await artifactStore.exists('.tff/milestones/M01/REQUIREMENTS.md')).toBe(true);
  });
});
