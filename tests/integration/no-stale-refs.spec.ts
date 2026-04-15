import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');

const OLD_SKILL_NAMES = ['interactive-design', 'debugging-methodology', 'code-review-checklist'];
const DELETED_AGENTS = [
  'tff-brainstormer',
  'tff-architect',
  'tff-product-lead',
  'tff-tester',
  'tff-doc-writer',
  'tff-skill-drafter',
  'tff-backend-dev',
  'tff-frontend-dev',
  'tff-devops',
];

function scanDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

function scanSkillsDir(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => {
      const skillPath = join(dir, entry, 'SKILL.md');
      return existsSync(skillPath);
    })
    .map((entry) => join(dir, entry, 'SKILL.md'));
}

describe('No stale references integration test', () => {
  const allFiles = [
    ...scanSkillsDir(join(ROOT, 'skills')),
    ...scanDir(join(ROOT, 'agents')),
    ...scanDir(join(ROOT, 'workflows')),
  ];

  it('should have no old skill file names on disk', () => {
    for (const old of OLD_SKILL_NAMES) {
      expect(existsSync(join(ROOT, 'skills', `${old}.md`))).toBe(false);
    }
  });

  it('should have no old skill name references in any markdown', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      for (const old of OLD_SKILL_NAMES) {
        expect(content).not.toContain(`@skills/${old}.md`);
      }
    }
  });

  it('should have no deleted agent files on disk', () => {
    for (const agent of DELETED_AGENTS) {
      expect(existsSync(join(ROOT, 'agents', `${agent}.md`))).toBe(false);
    }
  });

  it('should have 18 skill files', () => {
    const skills = scanSkillsDir(join(ROOT, 'skills'));
    expect(skills).toHaveLength(18);
  });
});
