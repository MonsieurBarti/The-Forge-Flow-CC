import { beforeEach, describe, expect, it } from 'vitest';
import { isErr, isOk } from '../../src/domain/result.js';
import { GitStateBranchAdapter } from '../../src/infrastructure/adapters/git/git-state-branch.adapter.js';
import { InMemoryArtifactStore } from '../../src/infrastructure/testing/in-memory-artifact-store.js';
import { InMemoryGitOps } from '../../src/infrastructure/testing/in-memory-git-ops.js';
import { InMemoryStateAdapter } from '../../src/infrastructure/testing/in-memory-state-adapter.js';
import { initProject } from '../../../src/application/project/init-project.js';

describe('initProject', () => {
  let adapter: InMemoryStateAdapter;
  let artifactStore: InMemoryArtifactStore;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    artifactStore = new InMemoryArtifactStore();
  });

  it('should create a project when none exists', async () => {
    const result = await initProject(
      { name: 'my-app', vision: 'A great app' },
      { projectStore: adapter, artifactStore },
    );
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

  it('should add .tff/ and build/ to .gitignore', async () => {
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    expect(await artifactStore.exists('.gitignore')).toBe(true);
    const content = await artifactStore.read('.gitignore');
    expect(isOk(content) && content.data).toContain('.tff/');
    expect(isOk(content) && content.data).toContain('build/');
  });

  it('should append missing entries to existing .gitignore', async () => {
    artifactStore.seed({ '.gitignore': 'node_modules/\n' });
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    const content = await artifactStore.read('.gitignore');
    expect(isOk(content) && content.data).toContain('node_modules/');
    expect(isOk(content) && content.data).toContain('.tff/');
    expect(isOk(content) && content.data).toContain('build/');
  });

  it('should not duplicate entries already in .gitignore', async () => {
    artifactStore.seed({ '.gitignore': 'node_modules/\n.tff/\nbuild/\n' });
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    const content = await artifactStore.read('.gitignore');
    if (isOk(content)) {
      const tffMatches = content.data.split('\n').filter((l) => l.trim() === '.tff/');
      const buildMatches = content.data.split('\n').filter((l) => l.trim() === 'build/');
      expect(tffMatches).toHaveLength(1);
      expect(buildMatches).toHaveLength(1);
    }
  });

  it('should only add missing entries when some already present', async () => {
    artifactStore.seed({ '.gitignore': 'node_modules/\nbuild/\n' });
    await initProject({ name: 'my-app', vision: 'A great app' }, { projectStore: adapter, artifactStore });
    const content = await artifactStore.read('.gitignore');
    if (isOk(content)) {
      expect(content.data).toContain('.tff/');
      const buildMatches = content.data.split('\n').filter((l) => l.trim() === 'build/');
      expect(buildMatches).toHaveLength(1);
    }
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

describe('initProject — state branch', () => {
  let adapter: InMemoryStateAdapter;
  let artifactStore: InMemoryArtifactStore;
  let gitOps: InMemoryGitOps;
  let stateBranch: GitStateBranchAdapter;

  beforeEach(() => {
    adapter = new InMemoryStateAdapter();
    artifactStore = new InMemoryArtifactStore();
    gitOps = new InMemoryGitOps();
    stateBranch = new GitStateBranchAdapter(gitOps, '/tmp/repo');
  });

  it('should create root state branch after project init', async () => {
    const result = await initProject(
      { name: 'my-app', vision: 'A great app' },
      { projectStore: adapter, artifactStore, stateBranch },
    );
    expect(isOk(result)).toBe(true);
    expect(gitOps.hasBranch('tff-state/main')).toBe(true);
  });

  it('should succeed even without stateBranch (backward compat)', async () => {
    const result = await initProject(
      { name: 'my-app', vision: 'A great app' },
      { projectStore: adapter, artifactStore },
    );
    expect(isOk(result)).toBe(true);
  });
});
