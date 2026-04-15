import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slice } from '../../src/../domain/entities/slice.js';
import { sliceTransitionCmd } from './slice-transition.cmd.js';

// Mock with-branch-guard - will pass through to inner function
const mockWithBranchGuard = vi.fn(async <T>(fn: (stores: any) => Promise<T>) =>
  fn({ sliceStore: mockSliceStore, milestoneStore: {}, taskStore: {} }),
);
vi.mock('../with-branch-guard.js', () => ({
  withBranchGuard: (...args: any[]) => mockWithBranchGuard(...args),
}));

// Mock the transition-slice use case to control behavior
const mockTransitionSliceUseCase = vi.fn();
vi.mock('../../application/lifecycle/transition-slice.js', () => ({
  transitionSliceUseCase: (...args: any[]) => mockTransitionSliceUseCase(...args),
  isOk: (result: any) => result.ok === true,
}));

// Mock isOk from domain/result
vi.mock('../../domain/result.js', () => ({
  isOk: (result: any) => result.ok === true,
}));

// Mock state generation (non-critical path)
vi.mock('../../application/sync/generate-state.js', () => ({
  generateState: vi.fn().mockResolvedValue(undefined),
}));

// Mock sync branch use case
vi.mock('../../application/state-branch/sync-branch.js', () => ({
  syncBranchUseCase: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

// Mock logging
vi.mock('../../infrastructure/adapters/logging/warn.js', () => ({
  tffWarn: vi.fn(),
}));

// Mock git adapters
vi.mock('../../infrastructure/adapters/git/git-cli.adapter.js', () => ({
  GitCliAdapter: vi.fn().mockImplementation(() => ({
    getCurrentBranch: vi.fn().mockResolvedValue({ ok: true, data: 'main' }),
  })),
}));

vi.mock('../../infrastructure/adapters/git/git-state-branch.adapter.js', () => ({
  GitStateBranchAdapter: vi.fn().mockImplementation(() => ({
    exists: vi.fn().mockResolvedValue({ ok: true, data: false }),
  })),
}));

// Mock state stores
vi.mock('../../infrastructure/adapters/sqlite/create-state-stores.js', () => ({
  createClosableStateStoresUnchecked: vi.fn().mockReturnValue({
    checkpoint: vi.fn(),
    close: vi.fn(),
  }),
}));

// Mock checkpoint-save command
vi.mock('./checkpoint-save.cmd.js', () => ({
  checkpointSaveCmd: vi.fn().mockResolvedValue(JSON.stringify({ ok: true })),
}));

// Mock markdown artifact adapter
vi.mock('../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js', () => ({
  MarkdownArtifactAdapter: vi.fn().mockImplementation(() => ({
    // mock methods as needed
  })),
}));

// Mock slice store that tests can configure
let mockSliceStore: any = {};

describe('slice-transition integration', () => {
  const testDir = '/test/project';

  beforeEach(() => {
    vi.resetAllMocks();
    mockSliceStore = {};
    mockTransitionSliceUseCase.mockReset();
    vi.stubGlobal('process', { ...process, cwd: () => testDir });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('invalid transition rejection', () => {
    it('rejects discussing → executing with INVALID_TRANSITION error', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: discussing → executing',
          context: { from: 'discussing', to: 'executing' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_TRANSITION');
    });

    it('includes recoveryHint with valid next steps for discussing status', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: discussing → executing',
          context: { from: 'discussing', to: 'executing' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      expect(parsed.error.recoveryHint).toBeDefined();
      expect(parsed.error.recoveryHint).toContain('Valid next');
      expect(parsed.error.recoveryHint).toContain('researching');
    });

    it('rejects researching → closed with INVALID_TRANSITION error', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: researching → closed',
          context: { from: 'researching', to: 'closed' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'closed']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_TRANSITION');
      expect(parsed.error.recoveryHint).toContain('Valid next');
      expect(parsed.error.recoveryHint).toContain('planning');
    });
  });

  describe('valid transition success', () => {
    it('allows discussing → researching transition', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'researching',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [
            { type: 'SLICE_TRANSITIONED', payload: { sliceId: 'M01-S01', from: 'discussing', to: 'researching' } },
          ],
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'researching']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.status).toBe('researching');
    });

    it('allows researching → planning transition', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'planning',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [
            { type: 'SLICE_TRANSITIONED', payload: { sliceId: 'M01-S01', from: 'researching', to: 'planning' } },
          ],
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'planning']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.status).toBe('planning');
    });

    it('allows planning → executing transition', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'executing',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [{ type: 'SLICE_TRANSITIONED', payload: { sliceId: 'M01-S01', from: 'planning', to: 'executing' } }],
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.status).toBe('executing');
    });

    it('returns warnings array in success response', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'researching',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [],
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'researching']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(true);
      expect(parsed.warnings).toBeDefined();
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });
  });

  describe('multiple valid options in recoveryHint', () => {
    it('shows both planning and executing as valid from planning status', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: planning → closed',
          context: { from: 'planning', to: 'closed' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'closed']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_TRANSITION');
      expect(parsed.error.recoveryHint).toContain('planning');
      expect(parsed.error.recoveryHint).toContain('executing');
    });

    it('shows reviewing and executing as valid from verifying status', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: verifying → closed',
          context: { from: 'verifying', to: 'closed' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'closed']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.recoveryHint).toContain('reviewing');
      expect(parsed.error.recoveryHint).toContain('executing');
    });

    it('shows completing and executing as valid from reviewing status', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: reviewing → planning',
          context: { from: 'reviewing', to: 'planning' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'planning']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.recoveryHint).toContain('completing');
      expect(parsed.error.recoveryHint).toContain('executing');
    });
  });

  describe('error format compliance with S04 pattern', () => {
    it('returns {ok: false, error: {code, message, recoveryHint}} for invalid transitions', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: discussing → executing',
          context: { from: 'discussing', to: 'executing' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      // Verify S04 compliant structure
      expect(parsed).toHaveProperty('ok', false);
      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toHaveProperty('code');
      expect(parsed.error).toHaveProperty('message');
      expect(parsed.error).toHaveProperty('recoveryHint');
    });

    it('returns {ok: true, data: {status}} for valid transitions', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'researching',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [],
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'researching']);
      const parsed = JSON.parse(result);

      // Verify S04 compliant success structure
      expect(parsed).toHaveProperty('ok', true);
      expect(parsed).toHaveProperty('data');
      expect(parsed.data).toHaveProperty('status');
    });

    it('returns INVALID_ARGS error for missing arguments', async () => {
      const result = await sliceTransitionCmd([]);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_ARGS');
      expect(parsed.error.message).toContain('Usage');
    });

    it('returns INVALID_ARGS error for missing target status', async () => {
      const result = await sliceTransitionCmd(['M01-S01']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_ARGS');
    });

    it('returns INVALID_ARGS error for invalid status value', async () => {
      const result = await sliceTransitionCmd(['M01-S01', 'not-a-status']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_ARGS');
      expect(parsed.error.message).toContain('Invalid status');
    });
  });

  describe('closed slice has no valid transitions', () => {
    it('shows "No valid transitions available" for closed slice', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition: closed → executing',
          context: { from: 'closed', to: 'executing' },
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.recoveryHint).toContain('No valid transitions available');
    });
  });

  describe('edge cases', () => {
    it('handles error without context.from gracefully', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'Invalid transition',
          // No context.from
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'executing']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('INVALID_TRANSITION');
      // Should not have recoveryHint when context.from is missing
      expect(parsed.error.recoveryHint).toBeUndefined();
    });

    it('passes through non-INVALID_TRANSITION errors unchanged', async () => {
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Slice not found',
        },
      });

      const result = await sliceTransitionCmd(['M01-S01', 'researching']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('NOT_FOUND');
      expect(parsed.error.recoveryHint).toBeUndefined();
    });

    it('handles CHECKPOINT_FAILED error correctly', async () => {
      const mockSlice: Slice = {
        id: 'M01-S01',
        milestoneId: 'M01',
        title: 'Test Slice',
        status: 'researching',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First mock for successful transition
      mockTransitionSliceUseCase.mockResolvedValue({
        ok: true,
        data: {
          slice: mockSlice,
          events: [],
        },
      });

      // Mock checkpoint failure by importing and mocking the checkpoint module
      const { checkpointSaveCmd } = await import('./checkpoint-save.cmd.js');
      vi.mocked(checkpointSaveCmd).mockRejectedValue(new Error('disk full'));

      const result = await sliceTransitionCmd(['M01-S01', 'researching']);
      const parsed = JSON.parse(result);

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe('CHECKPOINT_FAILED');
    });
  });
});
