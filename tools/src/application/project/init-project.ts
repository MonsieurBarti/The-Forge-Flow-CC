import { createProject, type Project } from '../../domain/entities/project.js';
import type { DomainError } from '../../domain/errors/domain-error.js';
import { projectExistsError } from '../../domain/errors/project-exists.error.js';
import type { ArtifactStore } from '../../domain/ports/artifact-store.port.js';
import type { ProjectStore } from '../../domain/ports/project-store.port.js';
import type { StateBranchPort } from '../../domain/ports/state-branch.port.js';
import { Err, isOk, Ok, type Result } from '../../domain/result.js';

interface InitProjectInput {
  name: string;
  vision: string;
}
interface InitProjectDeps {
  projectStore: ProjectStore;
  artifactStore: ArtifactStore;
  stateBranch?: StateBranchPort;
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

  // Ensure .tff/ is in .gitignore so artifacts never land on code branches
  await ensureTffGitignored(deps.artifactStore);

  const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
  await deps.artifactStore.write('.tff/PROJECT.md', projectMd);

  if (deps.stateBranch) {
    try {
      await deps.stateBranch.createRoot();
    } catch {
      // State branch creation is best-effort during init
    }
  }

  return Ok({ project: saveResult.data });
};

async function ensureTffGitignored(artifactStore: ArtifactStore): Promise<void> {
  const gitignorePath = '.gitignore';
  const tffEntry = '.tff/';

  if (await artifactStore.exists(gitignorePath)) {
    const readResult = await artifactStore.read(gitignorePath);
    if (isOk(readResult)) {
      const lines = readResult.data.split('\n');
      if (lines.some((line) => line.trim() === '.tff/' || line.trim() === '.tff')) return;
      const content = readResult.data.endsWith('\n')
        ? `${readResult.data}${tffEntry}\n`
        : `${readResult.data}\n${tffEntry}\n`;
      await artifactStore.write(gitignorePath, content);
      return;
    }
  }
  await artifactStore.write(gitignorePath, `${tffEntry}\n`);
}
