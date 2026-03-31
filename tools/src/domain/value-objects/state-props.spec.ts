import { describe, expect, it } from 'vitest';
import { ProjectPropsSchema } from './project-props.js';
import { MilestonePropsSchema } from './milestone-props.js';
import { SlicePropsSchema } from './slice-props.js';
import { TaskPropsSchema } from './task-props.js';
import { DependencySchema } from './dependency.js';
import { WorkflowSessionSchema } from './workflow-session.js';
import { MilestoneUpdatePropsSchema } from './milestone-update-props.js';
import { SliceUpdatePropsSchema } from './slice-update-props.js';
import { TaskUpdatePropsSchema } from './task-update-props.js';
import { MilestoneStatusSchema } from './milestone-status.js';

describe('MilestoneStatus (extracted)', () => {
  it('accepts valid statuses', () => {
    expect(MilestoneStatusSchema.safeParse('open').success).toBe(true);
    expect(MilestoneStatusSchema.safeParse('in_progress').success).toBe(true);
    expect(MilestoneStatusSchema.safeParse('closed').success).toBe(true);
  });
  it('rejects invalid status', () => {
    expect(MilestoneStatusSchema.safeParse('unknown').success).toBe(false);
  });
});

describe('ProjectProps', () => {
  it('accepts valid props', () => {
    expect(ProjectPropsSchema.safeParse({ name: 'My Project' }).success).toBe(true);
  });
  it('vision is optional', () => {
    expect(ProjectPropsSchema.safeParse({ name: 'P', vision: 'V' }).success).toBe(true);
  });
  it('rejects empty name', () => {
    expect(ProjectPropsSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('MilestoneProps', () => {
  it('requires number and name', () => {
    expect(MilestonePropsSchema.safeParse({ number: 1, name: 'M1' }).success).toBe(true);
  });
});

describe('MilestoneUpdateProps', () => {
  it('allows partial updates', () => {
    expect(MilestoneUpdatePropsSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });
  it('accepts empty object', () => {
    expect(MilestoneUpdatePropsSchema.safeParse({}).success).toBe(true);
  });
});

describe('SliceProps', () => {
  it('requires milestoneId, number, title', () => {
    expect(SlicePropsSchema.safeParse({ milestoneId: 'M01', number: 1, title: 'Slice' }).success).toBe(true);
  });
  it('tier is optional', () => {
    expect(SlicePropsSchema.safeParse({ milestoneId: 'M01', number: 1, title: 'S', tier: 'F-lite' }).success).toBe(true);
  });
});

describe('SliceUpdateProps', () => {
  it('allows partial updates', () => {
    expect(SliceUpdatePropsSchema.safeParse({ title: 'New' }).success).toBe(true);
  });
});

describe('TaskProps', () => {
  it('requires sliceId, number, title', () => {
    expect(TaskPropsSchema.safeParse({ sliceId: 'M01-S01', number: 1, title: 'Task' }).success).toBe(true);
  });
});

describe('TaskUpdateProps', () => {
  it('cannot set sliceId or number', () => {
    const result = TaskUpdatePropsSchema.safeParse({ sliceId: 'other', number: 99, title: 'ok' });
    if (result.success) {
      expect(result.data).not.toHaveProperty('sliceId');
      expect(result.data).not.toHaveProperty('number');
    }
  });
});

describe('Dependency', () => {
  it('validates blocks type', () => {
    expect(DependencySchema.safeParse({ fromId: 't1', toId: 't2', type: 'blocks' }).success).toBe(true);
  });
  it('rejects unknown types', () => {
    expect(DependencySchema.safeParse({ fromId: 't1', toId: 't2', type: 'validates' }).success).toBe(false);
  });
});

describe('WorkflowSession', () => {
  it('requires phase, rest optional', () => {
    expect(WorkflowSessionSchema.safeParse({ phase: 'idle' }).success).toBe(true);
  });
});
