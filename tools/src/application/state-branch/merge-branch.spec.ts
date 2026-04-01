import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { isOk } from '../../domain/result.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';
import { SQLiteStateAdapter } from '../../infrastructure/adapters/sqlite/sqlite-state.adapter.js';
import { InMemoryGitOps } from '../../infrastructure/testing/in-memory-git-ops.js';
import { mergeBranchUseCase } from './merge-branch.js';

const createDbBuffer = (): Buffer => {
  const dir = mkdtempSync(path.join(tmpdir(), 'merge-uc-'));
  const dbPath = path.join(dir, 'state.db');
  const a = SQLiteStateAdapter.create(dbPath);
  a.init();
  a.saveProject({ name: 'P', vision: 'V' });
  a.createMilestone({ number: 1, name: 'M1' });
  a.createSlice({ milestoneId: 'M01', number: 1, title: 'S1', tier: 'F-lite' });
  a.close();
  return readFileSync(dbPath);
};

describe('mergeBranchUseCase', () => {
  let gitOps: InMemoryGitOps;
  let stateBranch: GitStateBranchAdapter;

  beforeEach(async () => {
    gitOps = new InMemoryGitOps();
    stateBranch = new GitStateBranchAdapter(gitOps, '/tmp/repo');
    await stateBranch.createRoot();
    await stateBranch.fork('slice/M01-S01', 'tff-state/main');

    // Set up DB content for merge extraction
    const dbBuf = createDbBuffer();
    gitOps.setFileContent('tff-state/main', '.tff/state.db', dbBuf);
    gitOps.setFileContent('tff-state/slice/M01-S01', '.tff/state.db', dbBuf);
    gitOps.setTreeFiles('tff-state/slice/M01-S01', ['.tff/state.db']);
  });

  it('should merge child into parent and delete child branch', async () => {
    const r = await mergeBranchUseCase(
      { childCodeBranch: 'slice/M01-S01', parentCodeBranch: 'main', sliceId: 'M01-S01' },
      { stateBranch },
    );
    expect(isOk(r)).toBe(true);
  });
});
