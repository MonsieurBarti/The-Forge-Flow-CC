import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sessionRemindCmd } from './session-remind.cmd.js';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';
import * as generateReminderModule from '../../application/session/generate-reminder.js';

vi.mock('node:fs');
vi.mock('../../infrastructure/adapters/sqlite/create-state-stores.js');
vi.mock('../../application/session/generate-reminder.js');

describe('session-remind integration', () => {
  const testDir = '/test/project';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('process', { ...process, cwd: () => testDir });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when no active session exists', async () => {
    // Setup initialized project without session
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      if (p === path.join(testDir, '.tff', 'settings.yaml')) return false;
      return false;
    });

    const mockStores = {
      sessionStore: { getSession: vi.fn().mockReturnValue(null) },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue(null);

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toBeNull();
  });

  it('returns formatted reminder when session is active', async () => {
    // Setup project with active session and reminders enabled
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      if (p === path.join(testDir, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('workflow:\n  reminders: true');

    const mockSession = {
      milestoneId: 'M001',
      sliceId: 'S01',
      phase: 'executing',
      wave: 2,
      totalWaves: 3,
    };
    const mockStores = {
      sessionStore: { getSession: vi.fn().mockReturnValue(mockSession) },
      taskStore: { listTasks: vi.fn().mockReturnValue([]) },
      dependencyStore: { listDependencies: vi.fn().mockReturnValue([]) },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue('```\nM001-S01: executing | Wave 2/3 | Next: /tff:execute or /tff:pause\n```');

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).not.toBeNull();
    expect(parsed.data.reminder).toContain('M001');
    expect(parsed.data.reminder).toContain('S01');
    expect(parsed.data.reminder).toContain('executing');
    expect(parsed.data.reminder).toContain('Wave 2/3');
  });

  it('returns null when reminders are disabled in settings', async () => {
    // Setup project with reminders disabled
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      if (p === path.join(testDir, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('workflow:\n  reminders: false');

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toBeNull();
    // Should not attempt to create state stores when disabled
    expect(createStateStores).not.toHaveBeenCalled();
  });

  it('handles project without workflow.reminders setting (defaults enabled)', async () => {
    // Setup project without workflow section
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(testDir, '.tff')) return true;
      if (p === path.join(testDir, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('model-profiles:\n  quality:\n    model: sonnet');

    const mockSession = {
      milestoneId: 'M003',
      sliceId: 'S01',
      phase: 'reviewing',
      wave: 3,
      totalWaves: 4,
    };
    const mockStores = {
      sessionStore: { getSession: vi.fn().mockReturnValue(mockSession) },
      taskStore: { listTasks: vi.fn().mockReturnValue([]) },
      dependencyStore: { listDependencies: vi.fn().mockReturnValue([]) },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue('```\nM003-S01: reviewing | Wave 3/4\n```');

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).not.toBeNull();
    expect(parsed.data.reminder).toContain('M003');
  });
});
