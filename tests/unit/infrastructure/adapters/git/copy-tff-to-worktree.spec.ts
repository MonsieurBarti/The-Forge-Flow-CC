import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyTffToWorktree } from '../../../src/infrastructure/copy-tff-to-worktree.js';

describe('copyTffToWorktree', () => {
  let tmpDir: string;
  let tffDir: string;
  let worktreePath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `tff-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = path.join(tmpDir, '.tff');
    worktreePath = path.join(tmpDir, 'worktree');
    mkdirSync(tffDir, { recursive: true });
    mkdirSync(worktreePath, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies other files but excludes state.db and branch-meta.json', () => {
    writeFileSync(path.join(tffDir, 'state.db'), 'data');
    writeFileSync(path.join(tffDir, 'branch-meta.json'), '{}');
    writeFileSync(path.join(tffDir, 'journal.jsonl'), '{}');
    copyTffToWorktree(tffDir, worktreePath);
    expect(existsSync(path.join(worktreePath, '.tff', 'state.db'))).toBe(false);
    expect(existsSync(path.join(worktreePath, '.tff', 'branch-meta.json'))).toBe(false);
    expect(existsSync(path.join(worktreePath, '.tff', 'journal.jsonl'))).toBe(true);
  });

  it('still excludes worktrees directory and state.db', () => {
    mkdirSync(path.join(tffDir, 'worktrees'), { recursive: true });
    writeFileSync(path.join(tffDir, 'worktrees', 'dummy'), 'data');
    writeFileSync(path.join(tffDir, 'state.db'), 'data');
    writeFileSync(path.join(tffDir, 'checkpoint.json'), '{}');
    copyTffToWorktree(tffDir, worktreePath);
    expect(existsSync(path.join(worktreePath, '.tff', 'state.db'))).toBe(false);
    expect(existsSync(path.join(worktreePath, '.tff', 'worktrees'))).toBe(false);
    expect(existsSync(path.join(worktreePath, '.tff', 'checkpoint.json'))).toBe(true);
  });

  it('copies subdirectories recursively', () => {
    const subDir = path.join(tffDir, 'milestones', 'M01');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(path.join(subDir, 'REQUIREMENTS.md'), '# Req');
    copyTffToWorktree(tffDir, worktreePath);
    expect(existsSync(path.join(worktreePath, '.tff', 'milestones', 'M01', 'REQUIREMENTS.md'))).toBe(true);
  });

  it('no-ops when tff dir does not exist', () => {
    rmSync(tffDir, { recursive: true, force: true });
    expect(() => copyTffToWorktree(tffDir, worktreePath)).not.toThrow();
  });
});
