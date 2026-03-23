import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const WORKFLOWS_DIR = join(ROOT, 'workflows');

describe('F-lite integration: workflow skill loading', () => {
  it('discuss-slice loads brainstorming and acceptance-criteria-validation', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'discuss-slice.md'), 'utf-8');
    expect(content).toContain('@skills/brainstorming.md');
    expect(content).toContain('@skills/acceptance-criteria-validation.md');
    expect(content).toContain('@skills/stress-testing-specs.md');
  });

  it('plan-slice loads writing-plans and architecture-review', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'plan-slice.md'), 'utf-8');
    expect(content).toContain('@skills/writing-plans.md');
    expect(content).toContain('@skills/architecture-review.md');
  });

  it('execute-slice loads executing-plans and verification-before-completion', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'execute-slice.md'), 'utf-8');
    expect(content).toContain('@skills/executing-plans.md');
    expect(content).toContain('@skills/verification-before-completion.md');
    expect(content).toContain('@skills/test-driven-development.md');
  });

  it('verify-slice loads acceptance-criteria-validation and verification-before-completion', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'verify-slice.md'), 'utf-8');
    expect(content).toContain('@skills/acceptance-criteria-validation.md');
    expect(content).toContain('@skills/verification-before-completion.md');
  });

  it('ship-slice loads finishing-work and verification-before-completion', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'ship-slice.md'), 'utf-8');
    expect(content).toContain('@skills/finishing-work.md');
    expect(content).toContain('@skills/verification-before-completion.md');
  });

  it('auto-learn workflows load skill-authoring', () => {
    const autoLearnWorkflows = [
      'detect-patterns.md',
      'create-skill.md',
      'learn-skills.md',
      'compose-skills.md',
      'suggest-skills.md',
    ];
    for (const wf of autoLearnWorkflows) {
      const content = readFileSync(join(WORKFLOWS_DIR, wf), 'utf-8');
      expect(content).toContain('@skills/skill-authoring.md');
    }
  });

  it('debug workflow loads systematic-debugging', () => {
    const content = readFileSync(join(WORKFLOWS_DIR, 'debug.md'), 'utf-8');
    expect(content).toContain('@skills/systematic-debugging.md');
    expect(content).not.toContain('debugging-methodology');
  });
});
