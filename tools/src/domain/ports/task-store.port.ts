import type { Task } from '../entities/task.js';
import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { TaskProps } from '../value-objects/task-props.js';
import type { TaskUpdateProps } from '../value-objects/task-update-props.js';

export interface TaskStore {
  createTask(props: TaskProps): Result<Task, DomainError>;
  getTask(id: string): Result<Task | null, DomainError>;
  listTasks(sliceId: string): Result<Task[], DomainError>;
  updateTask(id: string, updates: TaskUpdateProps): Result<void, DomainError>;
  claimTask(id: string): Result<void, DomainError>;
  closeTask(id: string, reason?: string): Result<void, DomainError>;
  listReadyTasks(sliceId: string): Result<Task[], DomainError>;
  listStaleClaims(ttlMinutes: number): Result<Task[], DomainError>;
}
