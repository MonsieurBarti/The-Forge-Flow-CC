import type { Project } from '../../domain/entities/project.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import type { ProjectStore } from '../../domain/ports/project-store.port.js';
import { type Result } from '../../domain/result.js';

interface GetProjectDeps {
  projectStore: ProjectStore;
}

export const getProject = async (deps: GetProjectDeps): Promise<Result<Project | null, DomainError>> => {
  return deps.projectStore.getProject();
};
