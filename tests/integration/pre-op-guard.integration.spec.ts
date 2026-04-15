import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slice } from '../../src/domain/entities/slice.js';
import { preOpGuardCmd } from '../../src/cli/commands/pre-op-guard.cmd.js';

vi.mock('node:fs');

// Mock the with-sync-lock module - will pass through to inner function
const mockWithSyncLock = vi.fn(async <T>(fn: (stores: any) => Promise<T>) => fn({}));
vi.mock('../with-sync-lock.js', () => ({
  withSyncLock: (...args: any[]) => mockWithSyncLock(...args),
}));

// Mock with-branch-guard - will pass through to inner function
const mockWithBranchGuard = vi.fn(async <T>(fn: (stores: any) => Promise<T>) => fn({ sliceStore: mockSliceStore }));
vi.mock('../with-branch-guard.js', () => ({
  withBranchGuard: (...args: any[]) => mockWithBranchGuard(...args),
}));

// Mock slice store that tests can configure
let mockSliceStore: any = {};

// Mock the application validation functions
vi.mock('../../application/index.js', () => ({
  isValidOperation: (op: string) =>
    ['discuss', 'research', 'plan', 'execute', 'verify', 'ship', 'complete'].includes(op),
}));

vi.mock('../../application/guard/validate-operation.js', () => ({
  validateOperation: (operation: string, currentStatus: string) => {
    const requiredMap: Record<string, string> = {
      discuss: 'discussing',
      research: 'researching',
      plan: 'planning',
      execute: 'executing',
      verify: 'verifying',
      ship: 'reviewing',
      complete: 'completing',
    };
    const required = requiredMap[operation];
    const allowed = currentStatus === required;
    return {
      allowed,
      operation,
      currentStatus,
      requiredStatus: required,
      message: allowed
        ? `Operation '${operation}' is ready to execute (status: ${currentStatus})`
        : `Cannot ${operation} from ${currentStatus}.`,
      recoveryHint: allowed ? '' : `Run /tff:${required} first.`,
    };
  },
  OperationBlockedError: class OperationBlockedError extends Error {
    operation: string;
    currentStatus: string;
    requiredStatus: string;
    recoveryHint: string;
    constructor(result: any) {
      super(result.message);
      this.name = 'OperationBlockedError';
      this.operation = result.operation;
      this.currentStatus = result.currentStatus;
      this.requiredStatus = result.requiredStatus;
      this.recoveryHint = result.recoveryHint;
    }
  },
}));

describe('pre-op-guard integration', () => {
  const testDir = '/test/project';

  beforeEach(() => {
    vi.resetAllMocks();
    mockSliceStore = {};
    vi.stubGlobal('process', { ...process, cwd: () => testDir });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns blocked:false when guards are disabled in settings', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      if (p === path.join(testDir, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('workflow:\n  guards: false');

    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.blocked).toBe(false);
  });

  it('returns blocked:false when project is not initialized', async () => {
    vi.mocked(existsSync).mockImplementation(() => false);

    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.blocked).toBe(false);
  });

  it('returns error when args are missing', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    // Missing both args
    const result1 = await preOpGuardCmd([]);
    const parsed1 = JSON.parse(result1);
    expect(parsed1.ok).toBe(false);
    expect(parsed1.error.code).toBe('INVALID_ARGS');

    // Missing operation arg
    const result2 = await preOpGuardCmd(['S01']);
    const parsed2 = JSON.parse(result2);
    expect(parsed2.ok).toBe(false);
    expect(parsed2.error.code).toBe('INVALID_ARGS');
  });

  it('returns error for invalid operation name', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const result = await preOpGuardCmd(['S01', 'invalid-operation']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('INVALID_OPERATION');
    expect(parsed.error.recoveryHint).toContain('Supported operations');
  });

  it('returns error when slice is not found', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    // Mock slice store returning null
    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({ ok: true, data: null }),
    };

    const result = await preOpGuardCmd(['S99', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('SLICE_NOT_FOUND');
    expect(parsed.error.recoveryHint).toContain('S99');
  });

  it('returns error with recovery hint when operation is blocked', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const mockSlice: Slice = {
      id: 'S01',
      milestoneId: 'M001',
      title: 'Test Slice',
      status: 'discussing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
    };

    // Trying to execute from discussing status (requires executing status)
    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('PREREQUISITE_NOT_MET');
    expect(parsed.error.message).toContain('Cannot execute from discussing');
    expect(parsed.error.recoveryHint).toBeDefined();
    expect(parsed.error.recoveryHint.length).toBeGreaterThan(0);
  });

  it('returns blocked:false when operation is allowed', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const mockSlice: Slice = {
      id: 'S01',
      milestoneId: 'M001',
      title: 'Test Slice',
      status: 'executing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
    };

    // Execute from executing status (correct)
    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.blocked).toBe(false);
  });

  it('validates all workflow operations correctly', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const testCases: Array<{ operation: string; status: string; shouldBlock: boolean }> = [
      { operation: 'discuss', status: 'discussing', shouldBlock: false },
      { operation: 'research', status: 'researching', shouldBlock: false },
      { operation: 'plan', status: 'planning', shouldBlock: false },
      { operation: 'execute', status: 'executing', shouldBlock: false },
      { operation: 'verify', status: 'verifying', shouldBlock: false },
      { operation: 'ship', status: 'reviewing', shouldBlock: false },
      { operation: 'complete', status: 'completing', shouldBlock: false },
      // Blocked cases
      { operation: 'execute', status: 'discussing', shouldBlock: true },
      { operation: 'plan', status: 'discussing', shouldBlock: true },
      { operation: 'verify', status: 'executing', shouldBlock: true },
    ];

    for (const tc of testCases) {
      // Reset mock for each test case
      mockSliceStore = {
        getSlice: vi.fn().mockReturnValue({
          ok: true,
          data: {
            id: 'S01',
            milestoneId: 'M001',
            title: 'Test Slice',
            status: tc.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      };

      const result = await preOpGuardCmd(['S01', tc.operation]);
      const parsed = JSON.parse(result);

      if (tc.shouldBlock) {
        expect(parsed.ok, `${tc.operation} from ${tc.status} should be blocked`).toBe(false);
        expect(parsed.error.code).toBe('PREREQUISITE_NOT_MET');
      } else {
        expect(parsed.ok, `${tc.operation} from ${tc.status} should be allowed`).toBe(true);
        expect(parsed.data.blocked).toBe(false);
      }
    }
  });

  it('provides contextual recovery hints for blocked operations', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const mockSlice: Slice = {
      id: 'S01',
      milestoneId: 'M001',
      title: 'Test Slice',
      status: 'discussing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
    };

    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('PREREQUISITE_NOT_MET');
    expect(parsed.error.message).toBe('Cannot execute from discussing.');
    // Recovery hint should suggest running a /tff: command
    expect(parsed.error.recoveryHint).toContain('/tff:');
  });

  it('handles closed slice with no available operations', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    const mockSlice: Slice = {
      id: 'S01',
      milestoneId: 'M001',
      title: 'Test Slice',
      status: 'closed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
    };

    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('PREREQUISITE_NOT_MET');
    expect(parsed.error.recoveryHint).toContain('executing');
  });

  it('returns error when store operation fails', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      return false;
    });

    mockSliceStore = {
      getSlice: vi.fn().mockReturnValue({
        ok: false,
        error: { code: 'DB_ERROR', message: 'Database connection failed' },
      }),
    };

    const result = await preOpGuardCmd(['S01', 'execute']);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('SLICE_NOT_FOUND');
    expect(parsed.error.message).toContain('Database connection failed');
  });
});
