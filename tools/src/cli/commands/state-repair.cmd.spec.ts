import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stateRepairCmd } from './state-repair.cmd.js';
import { GitCliAdapter } from '../../infrastructure/adapters/git/git-cli.adapter.js';
import { GitStateBranchAdapter } from '../../infrastructure/adapters/git/git-state-branch.adapter.js';

describe('state:repair', () => {
  let tmpDir: string;
  let originalCwd: string;
  let tffDir: string;
  let gitOps: GitCliAdapter;
  let stateBranch: GitStateBranchAdapter;
  // Strip GIT_* env vars for CI compatibility
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));

  beforeEach(async () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'tff-repair-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    tffDir = path.join(tmpDir, '.tff');
    mkdirSync(tffDir, { recursive: true });

    // Initialize git repo using direct execSync
    execSync('git init', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git config user.name "Test User"', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tmpDir, stdio: 'ignore', env });

    // Create adapters
    gitOps = new GitCliAdapter(tmpDir);
    stateBranch = new GitStateBranchAdapter(gitOps, tmpDir);
    
    // Create root state branch (required before forking)
    const rootResult = await stateBranch.createRoot();
    expect(rootResult.ok).toBe(true);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns INVALID_ARGS when no branch provided', async () => {
    const result = JSON.parse(await stateRepairCmd([]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INVALID_ARGS');
  });

  it('returns STATE_BRANCH_NOT_FOUND when state branch does not exist', async () => {
    const result = JSON.parse(await stateRepairCmd(['nonexistent-branch']));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('STATE_BRANCH_NOT_FOUND');
  });

  it('skips when stamp already matches target branch', async () => {
    const codeBranch = 'feature-branch';
    
    // Create stamp that already matches (no need for state branch to exist)
    const stampPath = path.join(tffDir, 'branch-meta.json');
    writeFileSync(stampPath, JSON.stringify({
      stateId: '550e8400-e29b-41d4-a716-446655440000',
      codeBranch,
      parentStateBranch: null,
      createdAt: new Date().toISOString(),
      restoredAt: new Date().toISOString(),
    }, null, 2));

    const result = JSON.parse(await stateRepairCmd([codeBranch]));
    expect(result.ok).toBe(true);
    expect(result.data.action).toBe('skipped');
    expect(result.data.reason).toContain('already matches');
  });

  it('restores state and writes proper stamp', async () => {
    const codeBranch = 'feature-branch';

    // Create a feature branch with content using direct git commands
    execSync(`git checkout -b ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    
    // Create .tff content to sync
    writeFileSync(path.join(tffDir, 'state.db'), 'test db content');
    execSync('git add .tff/state.db', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit -m "Add state"', { cwd: tmpDir, stdio: 'ignore', env });

    // Fork state branch from root, then sync
    const forkResult = await stateBranch.fork(codeBranch, 'tff-state/main');
    expect(forkResult.ok).toBe(true);
    
    const syncResult = await stateBranch.sync(codeBranch, 'Sync test state');
    expect(syncResult.ok).toBe(true);

    // Switch back to main and delete feature branch
    execSync('git checkout main', { cwd: tmpDir, stdio: 'ignore', env });
    execSync(`git branch -D ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

    // Verify state file is gone (it was in feature branch, not main)
    expect(existsSync(path.join(tffDir, 'state.db'))).toBe(false);

    // Run repair
    const result = JSON.parse(await stateRepairCmd([codeBranch]));
    expect(result.ok).toBe(true);
    expect(result.data.action).toBe('restored');
    expect(result.data.filesRestored).toBeGreaterThan(0);

    // Verify stamp was written with the stateId from the state branch (created by fork)
    const stampPath = path.join(tffDir, 'branch-meta.json');
    expect(existsSync(stampPath)).toBe(true);
    const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
    expect(stamp.codeBranch).toBe(codeBranch);
    expect(stamp.stateId).toBeDefined(); // Has a valid UUID from fork
    expect(stamp.parentStateBranch).toBe('tff-state/main');
  });

  it('writes synthetic stamp when restore returns null', async () => {
    const codeBranch = 'empty-branch';

    // Create a feature branch 
    execSync(`git checkout -b ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "Empty commit"', { cwd: tmpDir, stdio: 'ignore', env });

    // Create an empty state branch (orphan with no files)
    execSync(`git checkout --orphan tff-state/${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit --allow-empty -m "Empty state branch"', { cwd: tmpDir, stdio: 'ignore', env });

    // Switch back to main and delete feature branch
    execSync('git checkout main', { cwd: tmpDir, stdio: 'ignore', env });
    execSync(`git branch -D ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

    // Run repair - state branch exists but has no content to restore
    const result = JSON.parse(await stateRepairCmd([codeBranch]));
    expect(result.ok).toBe(true);
    expect(result.data.action).toBe('synthetic');

    // Verify synthetic stamp was written
    const stampPath = path.join(tffDir, 'branch-meta.json');
    expect(existsSync(stampPath)).toBe(true);
    const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
    expect(stamp.codeBranch).toBe(codeBranch);
    expect(stamp.stateId).toBeDefined();
  });

  it('writes synthetic stamp when restore fails', async () => {
    const codeBranch = 'feature-branch';

    // Create a feature branch with content
    execSync(`git checkout -b ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    writeFileSync(path.join(tffDir, 'test.txt'), 'test content');
    execSync('git add .tff/test.txt', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit -m "Add test content"', { cwd: tmpDir, stdio: 'ignore', env });
    
    // Create state branch manually (orphan branch with minimal content but broken structure)
    execSync(`git checkout --orphan tff-state/${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    // Add a file but not proper .tff/ structure
    writeFileSync(path.join(tmpDir, 'wrong.txt'), 'wrong place');
    execSync('git add wrong.txt', { cwd: tmpDir, stdio: 'ignore', env });
    execSync('git commit -m "Wrong structure"', { cwd: tmpDir, stdio: 'ignore', env });

    // Switch back to main and delete feature branch
    execSync('git checkout main', { cwd: tmpDir, stdio: 'ignore', env });
    execSync(`git branch -D ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });

    // Run repair - should fail gracefully with synthetic stamp
    const result = JSON.parse(await stateRepairCmd([codeBranch]));
    expect(result.ok).toBe(true);
    expect(result.data.action).toBe('synthetic');

    // Verify synthetic stamp was written
    const stampPath = path.join(tffDir, 'branch-meta.json');
    expect(existsSync(stampPath)).toBe(true);
    const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
    expect(stamp.codeBranch).toBe(codeBranch);
  });

  it('returns error for unexpected failures', async () => {
    // Create a state branch first
    const codeBranch = 'broken-branch';
    execSync(`git checkout -b ${codeBranch}`, { cwd: tmpDir, stdio: 'ignore', env });
    
    // Fork state branch first
    const forkResult = await stateBranch.fork(codeBranch, 'tff-state/main');
    expect(forkResult.ok).toBe(true);
    
    // Switch back to main
    execSync('git checkout main', { cwd: tmpDir, stdio: 'ignore', env });
    
    // Now corrupt the .tff directory to make writing the stamp fail
    rmSync(tffDir, { recursive: true, force: true });
    writeFileSync(tffDir, 'not a directory'); // Make it a file

    const result = JSON.parse(await stateRepairCmd([codeBranch]));
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('REPAIR_FAILED');
  });
});
