import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BranchMismatchError } from '../../src/domain/errors/branch-mismatch.error.js';

/**
 * Helper: mock the BranchMismatchError module so the dynamically-imported
 * `with-branch-guard.ts` gets the *same* class reference as the test file.
 * Without this, `vi.resetModules()` gives the implementation a fresh class
 * and `instanceof` checks fail.
 */
function mockBranchMismatchError(): void {
  vi.doMock('../domain/errors/branch-mismatch.error.js', () => ({
    BranchMismatchError,
  }));
}

describe('withBranchGuard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fn result when no mismatch', async () => {
    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn().mockReturnValue({ projectStore: 'mock' }),
      createStateStoresUnchecked: vi.fn().mockReturnValue({ projectStore: 'mock' }),
      createClosableStateStores: vi.fn().mockReturnValue({ projectStore: 'mock', close: vi.fn(), checkpoint: vi.fn() }),
      createClosableStateStoresUnchecked: vi
        .fn()
        .mockReturnValue({ projectStore: 'mock', close: vi.fn(), checkpoint: vi.fn() }),
    }));

    const { withBranchGuard } = await import('./with-branch-guard.js');
    const result = await withBranchGuard(async (stores) => {
      expect(stores.projectStore).toBe('mock');
      return 'success';
    });
    expect(result).toBe('success');
  });

  it('catches BranchMismatchError and retries after restore', async () => {
    let callCount = 0;
    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new BranchMismatchError('old', 'new');
        return { projectStore: 'mock' };
      }),
      createStateStoresUnchecked: vi.fn().mockReturnValue({ projectStore: 'mock-unchecked' }),
      createClosableStateStores: vi.fn(),
      createClosableStateStoresUnchecked: vi.fn(),
    }));

    vi.doMock('../infrastructure/adapters/git/git-cli.adapter.js', () => ({
      GitCliAdapter: class MockGitCliAdapter {
        extractFile = vi.fn().mockResolvedValue({ ok: false, error: { code: 'NOT_FOUND', message: 'mock' } });
      },
    }));
    vi.doMock('../infrastructure/adapters/git/git-state-branch.adapter.js', () => ({
      GitStateBranchAdapter: class MockGitStateBranchAdapter {},
    }));
    vi.doMock('../application/state-branch/restore-branch.js', () => ({
      restoreBranchUseCase: vi.fn().mockResolvedValue({ ok: true, data: { filesRestored: 1, schemaVersion: 0 } }),
    }));
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(false),
      };
    });
    vi.doMock('../infrastructure/hooks/branch-meta-stamp.js', () => ({
      writeLocalStamp: vi.fn(),
      writeSyntheticStamp: vi.fn(),
    }));

    const { withBranchGuard } = await import('./with-branch-guard.js');
    const result = await withBranchGuard(async () => 'recovered');
    expect(result).toBe('recovered');
  });

  it('writes synthetic stamp when restore returns null', async () => {
    const mockWriteSyntheticStamp = vi.fn();

    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn().mockImplementation(() => {
        throw new BranchMismatchError('old', 'new');
      }),
      createStateStoresUnchecked: vi.fn().mockReturnValue({ projectStore: 'mock-unchecked' }),
      createClosableStateStores: vi.fn(),
      createClosableStateStoresUnchecked: vi.fn(),
    }));
    vi.doMock('../infrastructure/adapters/git/git-cli.adapter.js', () => ({
      GitCliAdapter: class MockGitCliAdapter {
        extractFile = vi.fn().mockResolvedValue({ ok: false, error: { code: 'NOT_FOUND', message: 'mock' } });
      },
    }));
    vi.doMock('../infrastructure/adapters/git/git-state-branch.adapter.js', () => ({
      GitStateBranchAdapter: class MockGitStateBranchAdapter {},
    }));
    vi.doMock('../application/state-branch/restore-branch.js', () => ({
      restoreBranchUseCase: vi.fn().mockResolvedValue({ ok: true, data: null }),
    }));
    vi.doMock('../infrastructure/hooks/branch-meta-stamp.js', () => ({
      writeLocalStamp: vi.fn(),
      writeSyntheticStamp: mockWriteSyntheticStamp,
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { withBranchGuard } = await import('./with-branch-guard.js');
    const result = await withBranchGuard(async () => 'fallback');
    expect(result).toBe('fallback');
    expect(mockWriteSyntheticStamp).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('rethrows non-BranchMismatchError errors', async () => {
    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn().mockImplementation(() => {
        throw new Error('unrelated failure');
      }),
      createStateStoresUnchecked: vi.fn(),
      createClosableStateStores: vi.fn(),
      createClosableStateStoresUnchecked: vi.fn(),
    }));

    const { withBranchGuard } = await import('./with-branch-guard.js');
    await expect(withBranchGuard(async () => 'never')).rejects.toThrow('unrelated failure');
  });
});

describe('withClosableBranchGuard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fn result when no mismatch', async () => {
    const mockClose = vi.fn();
    const mockCheckpoint = vi.fn();

    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn(),
      createStateStoresUnchecked: vi.fn(),
      createClosableStateStores: vi.fn().mockReturnValue({
        projectStore: 'mock',
        close: mockClose,
        checkpoint: mockCheckpoint,
      }),
      createClosableStateStoresUnchecked: vi.fn(),
    }));

    const { withClosableBranchGuard } = await import('./with-branch-guard.js');
    const result = await withClosableBranchGuard(async (stores) => {
      expect(stores.projectStore).toBe('mock');
      expect(stores.close).toBe(mockClose);
      expect(stores.checkpoint).toBe(mockCheckpoint);
      return 'closable-success';
    });
    expect(result).toBe('closable-success');
  });

  it('catches BranchMismatchError and retries with unchecked closable stores', async () => {
    const mockClose = vi.fn();
    const mockCheckpoint = vi.fn();

    mockBranchMismatchError();
    vi.doMock('../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
      createStateStores: vi.fn(),
      createStateStoresUnchecked: vi.fn(),
      createClosableStateStores: vi.fn().mockImplementation(() => {
        throw new BranchMismatchError('old', 'new');
      }),
      createClosableStateStoresUnchecked: vi.fn().mockReturnValue({
        projectStore: 'mock-unchecked',
        close: mockClose,
        checkpoint: mockCheckpoint,
      }),
    }));
    vi.doMock('../infrastructure/adapters/git/git-cli.adapter.js', () => ({
      GitCliAdapter: class MockGitCliAdapter {
        extractFile = vi.fn().mockResolvedValue({ ok: false, error: { code: 'NOT_FOUND', message: 'mock' } });
      },
    }));
    vi.doMock('../infrastructure/adapters/git/git-state-branch.adapter.js', () => ({
      GitStateBranchAdapter: class MockGitStateBranchAdapter {},
    }));
    vi.doMock('../application/state-branch/restore-branch.js', () => ({
      restoreBranchUseCase: vi.fn().mockResolvedValue({ ok: true, data: null }),
    }));
    vi.doMock('../infrastructure/hooks/branch-meta-stamp.js', () => ({
      writeLocalStamp: vi.fn(),
      writeSyntheticStamp: vi.fn(),
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { withClosableBranchGuard } = await import('./with-branch-guard.js');
    const result = await withClosableBranchGuard(async (stores) => {
      expect(stores.projectStore).toBe('mock-unchecked');
      return 'closable-recovered';
    });
    expect(result).toBe('closable-recovered');

    warnSpy.mockRestore();
  });
});
