import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { BeadLabel } from '../value-objects/bead-label.js';

export interface BeadData {
  id: string;
  label: string;
  title: string;
  status: string;
  design?: string;
  parentId?: string;
  blocks?: string[];
  validates?: string[];
  metadata?: Record<string, string>;
}

export interface BeadStore {
  init(): Promise<Result<void, DomainError>>;

  /** Register custom statuses with the backing store */
  registerStatuses(statuses: string[]): Promise<Result<void, DomainError>>;

  create(input: {
    label: BeadLabel;
    title: string;
    design?: string;
    description?: string;
    parentId?: string;
  }): Promise<Result<BeadData, DomainError>>;

  get(id: string): Promise<Result<BeadData, DomainError>>;

  list(filter: {
    label?: BeadLabel;
    parentId?: string;
    status?: string;
    includeAll?: boolean;
  }): Promise<Result<BeadData[], DomainError>>;

  /** List unblocked tasks ready for work (bd ready) */
  ready(): Promise<Result<BeadData[], DomainError>>;

  updateStatus(id: string, status: string): Promise<Result<void, DomainError>>;

  /** Atomically claim a task (sets assignee + status to in_progress) */
  claim(id: string): Promise<Result<void, DomainError>>;

  updateDesign(id: string, design: string): Promise<Result<void, DomainError>>;

  updateMetadata(id: string, key: string, value: string): Promise<Result<void, DomainError>>;

  addDependency(fromId: string, toId: string, type: 'blocks' | 'validates'): Promise<Result<void, DomainError>>;

  close(id: string, reason?: string): Promise<Result<void, DomainError>>;
}
