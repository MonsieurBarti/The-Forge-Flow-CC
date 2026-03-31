import { createProject, type Project } from '../../domain/entities/project.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import { projectExistsError } from '../../domain/errors/project-exists.error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { ProjectStore } from '../../domain/ports/project-store.port.js';
import { Err, isOk, Ok, type Result } from '../../domain/result.js';

interface InitProjectInput {
  name: string;
  vision: string;
}
interface InitProjectDeps {
  projectStore: ProjectStore;
  artifactStore: ArtifactStore;
}
interface InitProjectOutput {
  project: Project;
}

export const initProject = async (
  input: InitProjectInput,
  deps: InitProjectDeps,
): Promise<Result<InitProjectOutput, DomainError>> => {
  if (await deps.artifactStore.exists('.tff/PROJECT.md')) return Err(projectExistsError(input.name));

  const existing = deps.projectStore.getProject();
  if (!isOk(existing)) return existing;
  if (existing.data !== null) return Err(projectExistsError(input.name));

  const project = createProject(input);

  const saveResult = deps.projectStore.saveProject({ name: project.name, vision: project.vision });
  if (!isOk(saveResult)) return saveResult;

  await deps.artifactStore.mkdir('.tff');
  await deps.artifactStore.mkdir('.tff/milestones');

  const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
  await deps.artifactStore.write('.tff/PROJECT.md', projectMd);

  return Ok({ project: saveResult.data });
};
