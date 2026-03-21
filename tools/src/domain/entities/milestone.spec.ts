import { describe, it, expect } from 'vitest';
import {
  createMilestone,
  MilestoneSchema,
  formatMilestoneNumber,
} from './milestone.js';

describe('Milestone', () => {
  it('should create a milestone with name and project ID', () => {
    const ms = createMilestone({
      projectId: crypto.randomUUID(),
      name: 'MVP',
      number: 1,
    });
    expect(ms.name).toBe('MVP');
    expect(ms.number).toBe(1);
    expect(ms.status).toBe('open');
  });

  it('should format milestone number as M01', () => {
    expect(formatMilestoneNumber(1)).toBe('M01');
    expect(formatMilestoneNumber(12)).toBe('M12');
  });

  it('should validate against schema', () => {
    const ms = createMilestone({
      projectId: crypto.randomUUID(),
      name: 'Release',
      number: 2,
    });
    expect(() => MilestoneSchema.parse(ms)).not.toThrow();
  });

  it('should reject number less than 1', () => {
    expect(() =>
      createMilestone({
        projectId: crypto.randomUUID(),
        name: 'Bad',
        number: 0,
      }),
    ).toThrow();
  });
});
