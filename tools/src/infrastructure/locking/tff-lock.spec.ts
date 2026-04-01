import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireRestoreLock, isLocked } from './tff-lock.js';

describe('tff-lock', () => {
  let tmpDir: string;
  let lockTarget: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `tff-lock-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    lockTarget = join(tmpDir, 'state.db');
    writeFileSync(lockTarget, 'data');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('acquires and releases lock', async () => {
    const release = await acquireRestoreLock(lockTarget);
    expect(release).not.toBeNull();
    expect(await isLocked(lockTarget)).toBe(true);
    await release!();
    expect(await isLocked(lockTarget)).toBe(false);
  });

  it('returns null when lock is held and timeout expires', async () => {
    const release = await acquireRestoreLock(lockTarget);
    expect(release).not.toBeNull();
    const second = await acquireRestoreLock(lockTarget, 200);
    expect(second).toBeNull();
    await release!();
  });

  it('allows lock after previous is released', async () => {
    const release1 = await acquireRestoreLock(lockTarget);
    await release1!();
    const release2 = await acquireRestoreLock(lockTarget);
    expect(release2).not.toBeNull();
    await release2!();
  });
});
