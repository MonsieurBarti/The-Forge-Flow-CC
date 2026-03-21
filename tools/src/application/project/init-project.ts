import { type Result, Ok, Err, isOk } from '../../domain/result.js';
import { type DomainError } from '../../domain/errors/domain-error.js';
import { projectExistsError } from '../../domain/errors/project-exists.error.js';
import { createProject, type Project } from '../../domain/entities/project.js';
import { type BeadStore } from '../../domain/ports/bead-store.port.js';
import { type ArtifactStore } from '../../domain/ports/artifact-store.port.js';

interface InitProjectInput { name: string; vision: string; }
interface InitProjectDeps { beadStore: BeadStore; artifactStore: ArtifactStore; }
interface InitProjectOutput { project: Project; beadId: string; }

export const initProject = async (
  input: InitProjectInput,
  deps: InitProjectDeps,
): Promise<Result<InitProjectOutput, DomainError>> => {
  if (await deps.artifactStore.exists('.tff/PROJECT.md')) return Err(projectExistsError(input.name));

  const existing = await deps.beadStore.list({ label: 'tff:project' });
  if (isOk(existing) && existing.data.length > 0) return Err(projectExistsError(input.name));

  const project = createProject(input);

  const beadResult = await deps.beadStore.create({ label: 'tff:project', title: project.name, design: project.vision });
  if (!isOk(beadResult)) return beadResult;

  await deps.artifactStore.mkdir('.tff');
  await deps.artifactStore.mkdir('.tff/slices');

  const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
  await deps.artifactStore.write('.tff/PROJECT.md', projectMd);

  return Ok({ project, beadId: beadResult.data.id });
};
