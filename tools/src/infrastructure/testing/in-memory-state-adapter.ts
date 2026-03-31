import type { Project } from '../../domain/entities/project.js';
import type { Milestone } from '../../domain/entities/milestone.js';
import { formatMilestoneNumber } from '../../domain/entities/milestone.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import { hasOpenChildrenError } from '../../domain/errors/has-open-children.error.js';
import { Ok, type Result } from '../../domain/result.js';
import type { ProjectProps } from '../../domain/value-objects/project-props.js';
import type { MilestoneProps } from '../../domain/value-objects/milestone-props.js';
import type { MilestoneUpdateProps } from '../../domain/value-objects/milestone-update-props.js';
import type { WorkflowSession } from '../../domain/value-objects/workflow-session.js';
import type { DatabaseInit } from '../../domain/ports/database-init.port.js';
import type { ProjectStore } from '../../domain/ports/project-store.port.js';
import type { MilestoneStore } from '../../domain/ports/milestone-store.port.js';
import type { SessionStore } from '../../domain/ports/session-store.port.js';

export class InMemoryStateAdapter implements DatabaseInit, ProjectStore, MilestoneStore, SessionStore {
  private project: Project | null = null;
  private milestones = new Map<string, Milestone>();
  private session: WorkflowSession | null = null;

  init(): Result<void, DomainError> {
    return Ok(undefined);
  }

  // ProjectStore
  getProject(): Result<Project | null, DomainError> {
    return Ok(this.project);
  }

  saveProject(props: ProjectProps): Result<Project, DomainError> {
    const project: Project = {
      id: 'singleton',
      name: props.name,
      vision: props.vision,
      createdAt: this.project?.createdAt ?? new Date(),
    };
    this.project = project;
    return Ok(project);
  }

  // MilestoneStore
  createMilestone(props: MilestoneProps): Result<Milestone, DomainError> {
    const id = formatMilestoneNumber(props.number);
    const milestone: Milestone = {
      id,
      projectId: 'singleton',
      number: props.number,
      name: props.name,
      status: 'open',
      createdAt: new Date(),
    };
    this.milestones.set(id, milestone);
    return Ok(milestone);
  }

  getMilestone(id: string): Result<Milestone | null, DomainError> {
    return Ok(this.milestones.get(id) ?? null);
  }

  listMilestones(): Result<Milestone[], DomainError> {
    return Ok([...this.milestones.values()]);
  }

  updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError> {
    const ms = this.milestones.get(id);
    if (!ms) return Ok(undefined);
    if (updates.name !== undefined) ms.name = updates.name;
    if (updates.status !== undefined) ms.status = updates.status;
    this.milestones.set(id, ms);
    return Ok(undefined);
  }

  closeMilestone(id: string, reason?: string): Result<void, DomainError> {
    const ms = this.milestones.get(id);
    if (!ms) return Ok(undefined);
    // Check for open slices — will be implemented in T08 when slices are added
    ms.status = 'closed';
    ms.closeReason = reason;
    this.milestones.set(id, ms);
    return Ok(undefined);
  }

  // SessionStore
  getSession(): Result<WorkflowSession | null, DomainError> {
    return Ok(this.session);
  }

  saveSession(session: WorkflowSession): Result<void, DomainError> {
    this.session = session;
    return Ok(undefined);
  }
}
