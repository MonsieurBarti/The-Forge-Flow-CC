import { describe, it, expect, beforeEach } from 'vitest';
import { createMilestoneUseCase } from './create-milestone.js';
import { InMemoryBeadStore } from '../../infrastructure/testing/in-memory-bead-store.js';
import { InMemoryArtifactStore } from '../../infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { isOk } from '../../domain/result.js';

describe('createMilestoneUseCase', () => {
  let beadStore: InMemoryBeadStore;
  let artifactStore: InMemoryArtifactStore;
  let gitOps: InMemoryGitOps;

  beforeEach(() => {
    beadStore = new InMemoryBeadStore();
    artifactStore = new InMemoryArtifactStore();
    gitOps = new InMemoryGitOps();
    beadStore.seed([{ id: '00000000-0000-4000-8000-000000000001', label: 'tff:project', title: 'app', status: 'open' }]);
  });

  it('should create a milestone with bead and branch', async () => {
    const result = await createMilestoneUseCase(
      { projectBeadId: '00000000-0000-4000-8000-000000000001', name: 'MVP', number: 1 },
      { beadStore, artifactStore, gitOps },
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.milestone.name).toBe('MVP');
      expect(result.data.milestone.number).toBe(1);
      expect(gitOps.hasBranch('milestone/M01')).toBe(true);
    }
  });

  it('should create REQUIREMENTS.md stub', async () => {
    await createMilestoneUseCase(
      { projectBeadId: '00000000-0000-4000-8000-000000000001', name: 'MVP', number: 1 },
      { beadStore, artifactStore, gitOps },
    );

    expect(await artifactStore.exists('.tff/REQUIREMENTS.md')).toBe(true);
  });
});
