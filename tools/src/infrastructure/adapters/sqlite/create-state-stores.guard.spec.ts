import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('createStateStores guard', () => {
  let tmpDir: string;
  let tffDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `tff-guard-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    mkdirSync(tffDir, { recursive: true });
    dbPath = join(tffDir, 'state.db');

    // Init git repo — strip GIT_* env vars for CI compatibility
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'ignore', env });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws BranchMismatchError when stamp codeBranch mismatches', async () => {
    writeFileSync(
      join(tffDir, 'branch-meta.json'),
      JSON.stringify({
        stateId: '550e8400-e29b-41d4-a716-446655440000',
        codeBranch: 'some-other-branch',
        parentStateBranch: null,
        createdAt: '2026-04-01T10:00:00Z',
      }),
    );

    const { createStateStores } = await import('./create-state-stores.js');
    const { BranchMismatchError } = await import('../../../domain/errors/branch-mismatch.error.js');

    expect(() => createStateStores(dbPath)).toThrow(BranchMismatchError);
  });

  it('throws BranchMismatchError when stamp is missing but state.db exists', async () => {
    writeFileSync(dbPath, 'dummy-db');

    const { createStateStores } = await import('./create-state-stores.js');
    const { BranchMismatchError } = await import('../../../domain/errors/branch-mismatch.error.js');

    expect(() => createStateStores(dbPath)).toThrow(BranchMismatchError);
  });

  it('createStateStoresUnchecked skips guard', async () => {
    writeFileSync(
      join(tffDir, 'branch-meta.json'),
      JSON.stringify({
        stateId: '550e8400-e29b-41d4-a716-446655440000',
        codeBranch: 'wrong-branch',
        parentStateBranch: null,
        createdAt: '2026-04-01T10:00:00Z',
      }),
    );

    const { createStateStoresUnchecked } = await import('./create-state-stores.js');
    const { BranchMismatchError } = await import('../../../domain/errors/branch-mismatch.error.js');

    // Should not throw BranchMismatchError even with mismatched stamp
    try {
      createStateStoresUnchecked(dbPath);
    } catch (e) {
      expect(e).not.toBeInstanceOf(BranchMismatchError);
    }
  });
});
