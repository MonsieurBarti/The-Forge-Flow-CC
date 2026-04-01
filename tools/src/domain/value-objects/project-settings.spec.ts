import { describe, expect, it, vi } from 'vitest';
import { loadProjectSettings, ProjectSettingsSchema, parseProjectSettings } from './project-settings';

describe('ProjectSettingsSchema', () => {
  it('should parse a complete valid settings object', () => {
    const input = {
      'model-profiles': {
        quality: { model: 'opus' },
        balanced: { model: 'sonnet' },
        budget: { model: 'sonnet' },
      },
      autonomy: { mode: 'plan-to-pr' },
      'auto-learn': {
        weights: { frequency: 0.25, breadth: 0.3, recency: 0.25, consistency: 0.2 },
        guardrails: { 'min-corrections': 3, 'cooldown-days': 7, 'max-drift-pct': 20 },
        clustering: { 'min-sessions': 3, 'min-patterns': 2 },
      },
    };
    const result = ProjectSettingsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autonomy.mode).toBe('plan-to-pr');
    }
  });

  it('should reject invalid autonomy mode at schema level', () => {
    const input = { autonomy: { mode: 'yolo' } };
    const result = ProjectSettingsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autonomy.mode).toBe('guided');
    }
  });
});

describe('parseProjectSettings', () => {
  it('should return all defaults for undefined input', () => {
    const settings = parseProjectSettings(undefined);
    expect(settings.autonomy.mode).toBe('guided');
    expect(settings['model-profiles'].quality.model).toBe('opus');
    expect(settings['model-profiles'].balanced.model).toBe('sonnet');
    expect(settings['model-profiles'].budget.model).toBe('sonnet');
    expect(settings['auto-learn'].weights.frequency).toBe(0.25);
    expect(settings['auto-learn'].guardrails['min-corrections']).toBe(3);
    expect(settings['auto-learn'].clustering['min-sessions']).toBe(3);
  });

  it('should return all defaults for null input', () => {
    const settings = parseProjectSettings(null);
    expect(settings.autonomy.mode).toBe('guided');
  });

  it('should return all defaults for empty string input', () => {
    const settings = parseProjectSettings('');
    expect(settings.autonomy.mode).toBe('guided');
  });

  it('should return all defaults for non-object input', () => {
    const settings = parseProjectSettings(42);
    expect(settings.autonomy.mode).toBe('guided');
  });

  it('should fill missing sections with defaults', () => {
    const settings = parseProjectSettings({ autonomy: { mode: 'plan-to-pr' } });
    expect(settings.autonomy.mode).toBe('plan-to-pr');
    expect(settings['model-profiles'].quality.model).toBe('opus');
    expect(settings['auto-learn'].weights.breadth).toBe(0.3);
  });

  it('should fall back invalid fields to defaults while preserving valid siblings', () => {
    const settings = parseProjectSettings({
      autonomy: { mode: 'invalid-mode' },
      'model-profiles': { quality: { model: 'haiku' }, balanced: { model: 'sonnet' }, budget: { model: 'sonnet' } },
    });
    expect(settings.autonomy.mode).toBe('guided');
    expect(settings['model-profiles'].quality.model).toBe('haiku');
  });

  it('should handle partial auto-learn with defaults for missing fields', () => {
    const settings = parseProjectSettings({
      'auto-learn': { weights: { frequency: 0.5 } },
    });
    expect(settings['auto-learn'].weights.frequency).toBe(0.5);
    expect(settings['auto-learn'].weights.breadth).toBe(0.3);
    expect(settings['auto-learn'].guardrails['min-corrections']).toBe(3);
  });

});

describe('ProjectSettings - new keys', () => {
  it('should parse autonomy.max-retries with default 2', () => {
    const settings = parseProjectSettings({});
    expect(settings.autonomy['max-retries']).toBe(2);
  });

  it('should parse auto-learn.clustering.jaccard-threshold with default 0.3', () => {
    const settings = parseProjectSettings({});
    expect(settings['auto-learn'].clustering['jaccard-threshold']).toBe(0.3);
  });
});

describe('loadProjectSettings', () => {
  it('should return defaults for corrupted YAML', () => {
    const settings = loadProjectSettings('{ broken: yaml: [["');
    expect(settings.autonomy.mode).toBe('guided');
    expect(settings['model-profiles'].quality.model).toBe('opus');
  });

  it('should log a warning for corrupted YAML', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loadProjectSettings('{ broken: yaml: [["');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[tff]'), expect.any(String));
    warnSpy.mockRestore();
  });

  it('should parse valid YAML and return settings', () => {
    const yaml = 'autonomy:\n  mode: plan-to-pr\n';
    const settings = loadProjectSettings(yaml);
    expect(settings.autonomy.mode).toBe('plan-to-pr');
    expect(settings['model-profiles'].quality.model).toBe('opus');
  });

  it('should return defaults for empty file content', () => {
    const settings = loadProjectSettings('');
    expect(settings.autonomy.mode).toBe('guided');
  });
});
