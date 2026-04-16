/**
 * Tests for compress-markdown.sh script
 * Validates the script exists, is executable, and targets correct directories
 */

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'compress-markdown.sh');

describe('compress-markdown.sh', () => {
  it('should exist at scripts/compress-markdown.sh', () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('should be executable', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const stats = statSync(SCRIPT_PATH);
    // Check if any execute bit is set (owner, group, or others)
    const isExecutable = (stats.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });

  it('should be a bash script with shebang', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    expect(content.startsWith('#!/bin/bash')).toBe(true);
  });

  it('should target the correct directories', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    
    // Should include all target directories
    expect(content).toContain('commands/tff');
    expect(content).toContain('workflows');
    expect(content).toContain('skills');
    expect(content).toContain('references');
    expect(content).toContain('agents');
  });

  it('should invoke ultra-compress via pi non-interactive mode', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    
    // Should invoke pi with ultra-compress skill
    expect(content).toMatch(/pi\s+-p\s+"\/uc-file/);
    expect(content).toContain('symbolic');
    expect(content).toContain('--yes');
  });

  it('should use dynamic find for file enumeration', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    
    // Should use find command for dynamic enumeration
    expect(content).toContain('find');
    expect(content).toContain('SKILL.md');
  });

  it('should handle validation failures and log errors', () => {
    if (!existsSync(SCRIPT_PATH)) {
      throw new Error('Script does not exist');
    }
    const content = readFileSync(SCRIPT_PATH, 'utf8');
    
    // Should have error handling and logging
    expect(content).toMatch(/FAILED|error|log/i);
  });
});
