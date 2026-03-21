import { z } from 'zod';
import { type Result, Ok, Err } from '../result.js';
import { type DomainError, createDomainError } from '../errors/domain-error.js';
import { taskCompletedEvent } from '../events/task-completed.event.js';
import { type DomainEvent } from '../events/domain-event.js';

export const TaskStatusSchema = z.enum(['open', 'in_progress', 'closed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().min(1),
  sliceId: z.string().min(1),
  sliceRef: z.string(),
  name: z.string().min(1),
  taskRef: z.string(),
  taskNumber: z.number().int().min(1),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  status: TaskStatusSchema,
  executor: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  createdAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const createTask = (input: {
  sliceId: string;
  sliceRef: string;
  name: string;
  taskNumber: number;
  description: string;
  acceptanceCriteria: string[];
  dependsOn?: string[];
}): Task => {
  const task = {
    id: crypto.randomUUID(),
    sliceId: input.sliceId,
    sliceRef: input.sliceRef,
    name: input.name,
    taskRef: `T${input.taskNumber.toString().padStart(2, '0')}`,
    taskNumber: input.taskNumber,
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    status: 'open' as const,
    dependsOn: input.dependsOn ?? [],
    createdAt: new Date(),
  };
  return TaskSchema.parse(task);
};

export const startTask = (
  task: Task,
): Result<Task, DomainError> => {
  if (task.status !== 'open') {
    return Err(
      createDomainError(
        'INVALID_TRANSITION',
        `Cannot start task "${task.taskRef}" — status is "${task.status}", expected "open"`,
        { taskRef: task.taskRef, status: task.status },
      ),
    );
  }

  return Ok({ ...task, status: 'in_progress' as const });
};

export const completeTask = (
  task: Task,
  executor: string,
): Result<{ task: Task; events: DomainEvent[] }, DomainError> => {
  if (task.status !== 'in_progress') {
    return Err(
      createDomainError(
        'INVALID_TRANSITION',
        `Cannot complete task "${task.taskRef}" — status is "${task.status}", expected "in_progress"`,
        { taskRef: task.taskRef, status: task.status },
      ),
    );
  }

  const updated: Task = { ...task, status: 'closed', executor };
  const event = taskCompletedEvent(task.id, task.sliceRef, executor);

  return Ok({ task: updated, events: [event] });
};
