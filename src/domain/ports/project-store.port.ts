import type { Project } from '../entities/project.js';
import type { DomainError } from '../errors/domain-error.js';
import type { Result } from '../result.js';
import type { ProjectProps } from '../value-objects/project-props.js';

export interface ProjectStore {
  getProject(): Result<Project | null, DomainError>;
  saveProject(props: ProjectProps): Result<Project, DomainError>;
}
