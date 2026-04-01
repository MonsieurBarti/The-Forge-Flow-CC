import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { copyTffToWorktree } from './copy-tff-to-worktree.js';

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

  it('copies state.db but excludes branch-meta.json', () => {
    writeFileSync(path.join(tffDir, 'state.db'), 'data');
    writeFileSync(path.join(tffDir, 'branch-meta.json'), '{}');
    copyTffToWorktree(tffDir, worktreePath);
    expect(existsSync(path.join(worktreePath, '.tff', 'state.db'))).toBe(true);
    expect(existsSync(path.join(worktreePath, '.tff', 'branch-meta.json'))).toBe(false);
  });

  it('still excludes worktrees directory', () => {
    mkdirSync(path.join(tffDir, 'worktrees'), { recursive: true });
    writeFileSync(path.join(tffDir, 'worktrees', 'dummy'), 'data');
    writeFileSync(path.join(tffDir, 'state.db'), 'data');
    copyTffToWorktree(tffDir, worktreePath);
    expect(existsSync(path.join(worktreePath, '.tff', 'state.db'))).toBe(true);
    expect(existsSync(path.join(worktreePath, '.tff', 'worktrees'))).toBe(false);
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
