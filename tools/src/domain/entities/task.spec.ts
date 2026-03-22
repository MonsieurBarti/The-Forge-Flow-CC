import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '../result.js';
import { completeTask, createTask, startTask, TaskSchema } from './task.js';

describe('Task', () => {
  const makeTask = () =>
    createTask({
      sliceId: crypto.randomUUID(),
      sliceRef: 'M01-S01',
      name: 'Implement login',
      taskNumber: 3,
      description: 'Build the login form',
      acceptanceCriteria: ['Form renders', 'Validates email'],
    });

  it('should create a task with open status', () => {
    const task = makeTask();
    expect(task.status).toBe('open');
    expect(task.name).toBe('Implement login');
    expect(task.taskRef).toBe('T03');
  });

  it('should validate against schema', () => {
    expect(() => TaskSchema.parse(makeTask())).not.toThrow();
  });

  describe('startTask', () => {
    it('should transition open task to in_progress', () => {
      const task = makeTask();
      const result = startTask(task);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.status).toBe('in_progress');
      }
    });

    it('should reject starting an already in_progress task', () => {
      const task = { ...makeTask(), status: 'in_progress' as const };
      const result = startTask(task);
      expect(isErr(result)).toBe(true);
    });

    it('should reject starting a closed task', () => {
      const task = { ...makeTask(), status: 'closed' as const };
      const result = startTask(task);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('should mark an in_progress task as closed', () => {
      const task = { ...makeTask(), status: 'in_progress' as const };
      const result = completeTask(task, 'backend-dev');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.task.status).toBe('closed');
        expect(result.data.task.executor).toBe('backend-dev');
        expect(result.data.events[0].type).toBe('TASK_COMPLETED');
      }
    });

    it('should reject completing an open task', () => {
      const task = makeTask();
      const result = completeTask(task, 'backend-dev');
      expect(isErr(result)).toBe(true);
    });

    it('should reject completing a closed task', () => {
      const task = { ...makeTask(), status: 'closed' as const };
      const result = completeTask(task, 'backend-dev');
      expect(isErr(result)).toBe(true);
    });
  });
});
