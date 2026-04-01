import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { copyTffToWorktree } from './copy-tff-to-worktree.js';

describe('copyTffToWorktree', () => {
  it('should copy .tff/ excluding worktrees/', () => {
    const src = mkdtempSync(path.join(tmpdir(), 'tff-src-'));
    const dest = mkdtempSync(path.join(tmpdir(), 'tff-dest-'));
    writeFileSync(path.join(src, 'state.db'), 'db-content');
    writeFileSync(path.join(src, 'PROJECT.md'), '# P');
    mkdirSync(path.join(src, 'worktrees'));
    writeFileSync(path.join(src, 'worktrees', 'M01-S01'), 'should-be-excluded');
    mkdirSync(path.join(src, 'milestones'), { recursive: true });
    writeFileSync(path.join(src, 'milestones', 'M01.md'), '# M01');

    copyTffToWorktree(src, dest);

    expect(readFileSync(path.join(dest, '.tff', 'state.db'), 'utf-8')).toBe('db-content');
    expect(readFileSync(path.join(dest, '.tff', 'PROJECT.md'), 'utf-8')).toBe('# P');
    expect(readFileSync(path.join(dest, '.tff', 'milestones', 'M01.md'), 'utf-8')).toBe('# M01');
    // worktrees/ should NOT be copied
    expect(() => readFileSync(path.join(dest, '.tff', 'worktrees', 'M01-S01'))).toThrow();
  });
});
