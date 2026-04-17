import { createProject, type Project } from "../../domain/entities/project.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { projectExistsError } from "../../domain/errors/project-exists.error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { ProjectStore } from "../../domain/ports/project-store.port.js";

import { Err, isOk, Ok, type Result } from "../../domain/result.js";

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
	if (await deps.artifactStore.exists(".tff-cc/PROJECT.md"))
		return Err(projectExistsError(input.name));

	const existing = deps.projectStore.getProject();
	if (!isOk(existing)) return existing;
	if (existing.data !== null) return Err(projectExistsError(input.name));

	const project = createProject(input);

	const saveResult = deps.projectStore.saveProject({ name: project.name, vision: project.vision });
	if (!isOk(saveResult)) return saveResult;

	await deps.artifactStore.mkdir(".tff-cc");
	await deps.artifactStore.mkdir(".tff-cc/milestones");

	// Ensure .tff-cc/ and build/ are in .gitignore so artifacts never land on code branches
	await ensureGitignored(deps.artifactStore);

	const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
	await deps.artifactStore.write(".tff-cc/PROJECT.md", projectMd);

	return Ok({ project: saveResult.data });
};

const REQUIRED_GITIGNORE_ENTRIES = [".tff-cc/", "build/"];

async function ensureGitignored(artifactStore: ArtifactStore): Promise<void> {
	const gitignorePath = ".gitignore";

	let existing = "";
	if (await artifactStore.exists(gitignorePath)) {
		const readResult = await artifactStore.read(gitignorePath);
		if (isOk(readResult)) existing = readResult.data;
	}

	const lines = existing.split("\n");
	const missing = REQUIRED_GITIGNORE_ENTRIES.filter(
		(entry) =>
			!lines.some((line) => line.trim() === entry || line.trim() === entry.replace(/\/$/, "")),
	);

	if (missing.length === 0) return;

	const suffix = missing.map((e) => e).join("\n");
	const content =
		existing.length === 0
			? `${suffix}\n`
			: existing.endsWith("\n")
				? `${existing}${suffix}\n`
				: `${existing}\n${suffix}\n`;
	await artifactStore.write(gitignorePath, content);
}
