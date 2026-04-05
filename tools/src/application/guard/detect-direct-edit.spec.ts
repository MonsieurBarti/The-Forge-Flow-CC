import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SessionStore } from '../../domain/ports/session-store.port.js';
import type { TaskStore } from '../../domain/ports/task-store.port.js';
import type { WorkflowSession } from '../../domain/value-objects/workflow-session.js';
import type { Task } from '../../domain/entities/task.js';
import { detectDirectEdit, type DetectDirectEditDeps } from './detect-direct-edit.js';
import { Ok, Err } from '../../domain/result.js';
import * as fs from 'node:fs';
import * as yaml from 'yaml';

// Mock fs module using factory pattern
vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// Mock yaml module
vi.mock('yaml', () => {
  return {
    parse: vi.fn(),
  };
});

const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedReadFileSync = vi.mocked(fs.readFileSync);
const mockedParseYaml = vi.mocked(yaml.parse);

describe('detect-direct-edit', () => {
  let mockSessionStore: SessionStore;
  let mockTaskStore: TaskStore;
  let deps: DetectDirectEditDeps;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default: project initialized, guards enabled
    mockedExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('.tff')) return true;
      return false;
    });
    mockedReadFileSync.mockReturnValue('');
    mockedParseYaml.mockReturnValue({});

    mockSessionStore = {
      getSession: vi.fn(),
      saveSession: vi.fn(),
    };

    mockTaskStore = {
      createTask: vi.fn(),
      getTask: vi.fn(),
      listTasks: vi.fn(),
      updateTask: vi.fn(),
      claimTask: vi.fn(),
      closeTask: vi.fn(),
      listReadyTasks: vi.fn(),
      listStaleClaims: vi.fn(),
      getExecutorsForSlice: vi.fn(),
    };

    deps = {
      sessionStore: mockSessionStore,
      taskStore: mockTaskStore,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GUARD_DISABLED', () => {
    it('should return null warning when workflow.guards is false in settings.yaml', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return true;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue('workflow:\n  guards: false');
      mockedParseYaml.mockReturnValue({ workflow: { guards: false } });

      const result = detectDirectEdit(deps);

      expect(result.warning).toBeNull();
      expect(result.reason).toBe('GUARD_DISABLED');
    });

    it('should proceed with detection when workflow.guards is true', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return true;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue('workflow:\n  guards: true');
      mockedParseYaml.mockReturnValue({ workflow: { guards: true } });

      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
      expect(result.warning).not.toBeNull();
    });

    it('should proceed with detection when workflow.guards is not set', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return true;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue('workflow:\n  reminders: true');
      mockedParseYaml.mockReturnValue({ workflow: { reminders: true } });

      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
      expect(result.warning).not.toBeNull();
    });

    it('should proceed with detection when settings.yaml does not exist', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return false;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });

      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
      expect(result.warning).not.toBeNull();
    });

    it('should proceed with detection when settings.yaml is empty', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return true;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue('');
      mockedParseYaml.mockReturnValue({});

      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
      expect(result.warning).not.toBeNull();
    });

    it('should proceed with detection when settings.yaml fails to parse', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff/settings.yaml')) return true;
        if (typeof p === 'string' && p.includes('.tff')) return true;
        return false;
      });
      mockedReadFileSync.mockReturnValue('invalid: yaml: content:');
      mockedParseYaml.mockImplementation(() => {
        throw new Error('Parse error');
      });

      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
      expect(result.warning).not.toBeNull();
    });
  });

  describe('NOT_INITIALIZED', () => {
    it('should return null warning when .tff directory does not exist', () => {
      mockedExistsSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('.tff')) return false;
        return false;
      });

      const result = detectDirectEdit(deps);

      expect(result.warning).toBeNull();
      expect(result.reason).toBe('NOT_INITIALIZED');
    });
  });

  describe('NO_ACTIVE_SLICE', () => {
    it('should return warning when sessionStore returns null', () => {
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_ACTIVE_SLICE');
      expect(result.warning?.message).toContain('No active workflow session');
      expect(result.warning?.suggestion).toContain('/tff:quick');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });

    it('should return warning when session has no activeSliceId', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: null,
        phase: 'idle',
      };
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_ACTIVE_SLICE');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });

    it('should return warning when sessionStore returns an error (branch mismatch handled gracefully)', () => {
      mockSessionStore.getSession = vi.fn().mockReturnValue(
        Err({
          code: 'BRANCH_MISMATCH',
          message: 'Branch mismatch detected',
          details: {},
        })
      );

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_ACTIVE_SLICE');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });
  });

  describe('NO_CLAIMED_TASK', () => {
    it('should return warning when active slice exists but has no tasks', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok([]));

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_CLAIMED_TASK');
      expect(result.warning?.message).toContain('S01');
      expect(result.warning?.suggestion).toContain('/tff:claim');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });

    it('should return warning when active slice has only open tasks (none claimed)', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      const tasks: Task[] = [
        {
          id: 'S01-T01',
          sliceId: 'S01',
          number: 1,
          title: 'Task 1',
          status: 'open',
          createdAt: new Date(),
        },
        {
          id: 'S01-T02',
          sliceId: 'S01',
          number: 2,
          title: 'Task 2',
          status: 'open',
          createdAt: new Date(),
        },
      ];
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok(tasks));

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_CLAIMED_TASK');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });

    it('should return warning when active slice has only closed tasks (none claimed)', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      const tasks: Task[] = [
        {
          id: 'S01-T01',
          sliceId: 'S01',
          number: 1,
          title: 'Task 1',
          status: 'closed',
          createdAt: new Date(),
        },
      ];
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok(tasks));

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_CLAIMED_TASK');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });

    it('should return warning when taskStore.listTasks returns an error', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(
        Err({
          code: 'STORE_ERROR',
          message: 'Database error',
          details: {},
        })
      );

      const result = detectDirectEdit(deps);

      expect(result.warning).not.toBeNull();
      expect(result.warning?.code).toBe('NO_CLAIMED_TASK');
      expect(result.warning?.message).toContain('S01');
      expect(result.reason).toBe('DIRECT_EDIT_DETECTED');
    });
  });

  describe('CLAIMED_TASK_EXISTS', () => {
    it('should return null warning when there is an in_progress task (claimed)', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      const tasks: Task[] = [
        {
          id: 'S01-T01',
          sliceId: 'S01',
          number: 1,
          title: 'Task 1',
          status: 'in_progress',
          claimedAt: new Date(),
          claimedBy: 'agent-1',
          createdAt: new Date(),
        },
        {
          id: 'S01-T02',
          sliceId: 'S01',
          number: 2,
          title: 'Task 2',
          status: 'open',
          createdAt: new Date(),
        },
      ];
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok(tasks));

      const result = detectDirectEdit(deps);

      expect(result.warning).toBeNull();
      expect(result.reason).toBe('CLAIMED_TASK_EXISTS');
    });

    it('should return null warning when at least one task is in_progress', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S02',
        phase: 'researching',
      };
      const tasks: Task[] = [
        {
          id: 'S02-T01',
          sliceId: 'S02',
          number: 1,
          title: 'Research task',
          status: 'closed',
          createdAt: new Date(),
        },
        {
          id: 'S02-T02',
          sliceId: 'S02',
          number: 2,
          title: 'Active task',
          status: 'in_progress',
          claimedAt: new Date(),
          claimedBy: 'agent-1',
          createdAt: new Date(),
        },
      ];
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok(tasks));

      const result = detectDirectEdit(deps);

      expect(result.warning).toBeNull();
      expect(result.reason).toBe('CLAIMED_TASK_EXISTS');
    });
  });

  describe('warning message formatting', () => {
    it('should include sliceId in NO_CLAIMED_TASK warning message', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'M002-S03',
        phase: 'executing',
      };
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok([]));

      const result = detectDirectEdit(deps);

      expect(result.warning?.message).toContain('M002-S03');
    });

    it('should suggest /tff:quick in NO_ACTIVE_SLICE warning', () => {
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(null));

      const result = detectDirectEdit(deps);

      expect(result.warning?.suggestion).toContain('/tff:quick');
      expect(result.warning?.suggestion).toContain('/tff:start');
    });

    it('should suggest /tff:quick and /tff:claim in NO_CLAIMED_TASK warning', () => {
      const session: WorkflowSession = {
        activeMilestoneId: 'M001',
        activeSliceId: 'S01',
        phase: 'executing',
      };
      mockSessionStore.getSession = vi.fn().mockReturnValue(Ok(session));
      mockTaskStore.listTasks = vi.fn().mockReturnValue(Ok([]));

      const result = detectDirectEdit(deps);

      expect(result.warning?.suggestion).toContain('/tff:quick');
      expect(result.warning?.suggestion).toContain('/tff:claim');
    });
  });
});
