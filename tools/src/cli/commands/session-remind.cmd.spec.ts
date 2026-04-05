import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as generateReminderModule from '../../application/session/generate-reminder.js';
import { createStateStores } from '../../infrastructure/adapters/sqlite/create-state-stores.js';
import { sessionRemindCmd } from './session-remind.cmd.js';

vi.mock('node:fs');
vi.mock('../../infrastructure/adapters/sqlite/create-state-stores.js');
vi.mock('../../application/session/generate-reminder.js');

describe('sessionRemindCmd', () => {
  const mockCwd = '/test/project';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('process', { ...process, cwd: () => mockCwd });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return null reminder when project is not initialized', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toBeNull();
  });

  it('should return null reminder when workflow.reminders is false in settings', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(mockCwd, '.tff')) return true;
      if (p === path.join(mockCwd, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('workflow:\n  reminders: false');

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toBeNull();
    // Should not attempt to create state stores when reminders disabled
    expect(createStateStores).not.toHaveBeenCalled();
  });

  it('should proceed with reminder generation when settings has reminders enabled', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(mockCwd, '.tff')) return true;
      if (p === path.join(mockCwd, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('workflow:\n  reminders: true');

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue(
      '```\nM001-S01: executing | Wave 1/2 | Next: /tff:execute or /tff:pause\n```',
    );

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toContain('M001-S01');
  });

  it('should return reminder string from generateReminder when session exists', async () => {
    vi.mocked(existsSync).mockImplementation((p) => p === path.join(mockCwd, '.tff'));

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue(
      '```\nM001-S01: executing | Wave 1/2 | Next: /tff:execute or /tff:pause\n```',
    );

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(true);
    expect(parsed.data.reminder).toBe('```\nM001-S01: executing | Wave 1/2 | Next: /tff:execute or /tff:pause\n```');
  });

  it('should return null reminder when generateReminder returns null', async () => {
    vi.mocked(existsSync).mockImplementation((p) => p === path.join(mockCwd, '.tff'));

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
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

  it('should handle settings.yaml parse errors gracefully', async () => {
    vi.mocked(existsSync).mockImplementation((p) => {
      if (p === path.join(mockCwd, '.tff')) return true;
      if (p === path.join(mockCwd, '.tff', 'settings.yaml')) return true;
      return false;
    });
    vi.mocked(readFileSync).mockReturnValue('invalid: yaml: content: [');

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue(null);

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    // Should default to enabled (not disabled) on parse error
    expect(parsed.ok).toBe(true);
  });

  it('should return JSON error when generateReminder throws', async () => {
    vi.mocked(existsSync).mockImplementation((p) => p === path.join(mockCwd, '.tff'));

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe('REMINDER_GENERATION_FAILED');
    expect(parsed.error.message).toBe('Database error');
  });

  it('should return JSON with ok/data structure', async () => {
    vi.mocked(existsSync).mockImplementation((p) => p === path.join(mockCwd, '.tff'));

    const mockStores = {
      sessionStore: { getSession: vi.fn() },
      taskStore: { listTasks: vi.fn() },
      dependencyStore: { listDependencies: vi.fn() },
    };
    vi.mocked(createStateStores).mockReturnValue(mockStores as any);
    vi.mocked(generateReminderModule.generateReminder).mockReturnValue(null);

    const result = await sessionRemindCmd([]);
    const parsed = JSON.parse(result);

    // Verify structure: { ok: boolean, data: { reminder: string|null } }
    expect(parsed).toHaveProperty('ok');
    expect(typeof parsed.ok).toBe('boolean');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveProperty('reminder');
  });
});
