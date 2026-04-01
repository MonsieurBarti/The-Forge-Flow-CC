import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hookPostCheckoutCmd } from '../cli/commands/hook-post-checkout.cmd.js';
import { BranchMismatchError } from '../domain/errors/branch-mismatch.error.js';
import { createStateStores } from '../infrastructure/adapters/sqlite/create-state-stores.js';
import { readLocalStamp, writeLocalStamp, writeSyntheticStamp } from '../infrastructure/hooks/branch-meta-stamp.js';
import { installPostCheckoutHook } from '../infrastructure/hooks/install-post-checkout.js';
import { TFF_HOOK_MARKER } from '../infrastructure/hooks/post-checkout-template.js';

describe('post-checkout restore integration', () => {
  let tmpDir: string;
  let tffDir: string;

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `tff-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    tffDir = join(tmpDir, '.tff');
    mkdirSync(tffDir, { recursive: true });
    execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
    execSync('git commit --allow-empty -m "init"', {
      cwd: tmpDir,
      stdio: 'ignore',
    });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('factory guard', () => {
    it('throws BranchMismatchError when stamp codeBranch mismatches', () => {
      writeFileSync(
        join(tffDir, 'branch-meta.json'),
        JSON.stringify({
          stateId: '550e8400-e29b-41d4-a716-446655440000',
          codeBranch: 'wrong-branch',
          parentStateBranch: null,
          createdAt: '2026-04-01T10:00:00Z',
        }),
      );
      const dbPath = join(tffDir, 'state.db');
      expect(() => createStateStores(dbPath)).toThrow(BranchMismatchError);
    });

    it('throws BranchMismatchError when no stamp but state.db exists', () => {
      const dbPath = join(tffDir, 'state.db');
      writeFileSync(dbPath, 'dummy');
      expect(() => createStateStores(dbPath)).toThrow(BranchMismatchError);
    });

    it('does not throw BranchMismatchError when stamp matches current branch', () => {
      const currentBranch = execSync('git branch --show-current', {
        cwd: tmpDir,
        encoding: 'utf8',
      }).trim();
      writeFileSync(
        join(tffDir, 'branch-meta.json'),
        JSON.stringify({
          stateId: '550e8400-e29b-41d4-a716-446655440000',
          codeBranch: currentBranch,
          parentStateBranch: null,
          createdAt: '2026-04-01T10:00:00Z',
        }),
      );
      const dbPath = join(tffDir, 'state.db');
      // Will throw because no real SQLite DB, but NOT BranchMismatchError
      try {
        createStateStores(dbPath);
      } catch (e) {
        expect(e).not.toBeInstanceOf(BranchMismatchError);
      }
    });
  });

  describe('stamp helpers', () => {
    it('roundtrip write and read', () => {
      writeLocalStamp(tffDir, {
        stateId: '550e8400-e29b-41d4-a716-446655440000',
        codeBranch: 'slice/M01-S05',
        parentStateBranch: 'tff-state/milestone/M01',
        createdAt: '2026-04-01T10:00:00Z',
      });
      const stamp = readLocalStamp(tffDir);
      expect(stamp).not.toBeNull();
      expect(stamp!.codeBranch).toBe('slice/M01-S05');
      expect(stamp!.stateId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(stamp!.restoredAt).toBeDefined();
    });

    it('synthetic stamp has valid UUID and correct branch', () => {
      writeSyntheticStamp(tffDir, 'my-branch');
      const stamp = readLocalStamp(tffDir);
      expect(stamp).not.toBeNull();
      expect(stamp!.codeBranch).toBe('my-branch');
      expect(stamp!.stateId).toMatch(/^[0-9a-f]{8}-/);
    });
  });

  describe('hook installation', () => {
    it('installs executable hook with tff marker', () => {
      installPostCheckoutHook(tmpDir);
      const hookPath = join(tmpDir, '.git', 'hooks', 'post-checkout');
      expect(existsSync(hookPath)).toBe(true);
      expect(statSync(hookPath).mode & 0o111).toBeTruthy();
      expect(readFileSync(hookPath, 'utf8')).toContain(TFF_HOOK_MARKER);
    });
  });

  describe('hook command', () => {
    it('returns INVALID_ARGS without branch', async () => {
      const result = JSON.parse(await hookPostCheckoutCmd([]));
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_ARGS');
    });
  });
});
