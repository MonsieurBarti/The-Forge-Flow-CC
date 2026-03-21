import { describe, it, expect } from 'vitest';
import { validateSkill } from './validate-skill.js';
import { isOk, isErr } from '../../domain/result.js';

describe('validateSkill', () => {
  it('should accept a valid skill', () => {
    const result = validateSkill({
      name: 'tdd-workflow',
      description: 'Use when implementing features with TDD',
      content: '# TDD Workflow\n\n## When to Use\n...',
    });
    expect(isOk(result)).toBe(true);
  });

  it('should reject invalid name (uppercase)', () => {
    const result = validateSkill({
      name: 'TDD-Workflow',
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });

  it('should reject name with consecutive hyphens', () => {
    const result = validateSkill({
      name: 'tdd--workflow',
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });

  it('should warn if description lacks activation trigger', () => {
    const result = validateSkill({
      name: 'my-skill',
      description: 'A nice skill for things',
      content: '# content',
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data.warnings).toContain('Description should start with "Use when"');
    }
  });

  it('should reject name longer than 64 chars', () => {
    const result = validateSkill({
      name: 'a'.repeat(65),
      description: 'Use when...',
      content: '# content',
    });
    expect(isErr(result)).toBe(true);
  });
});
