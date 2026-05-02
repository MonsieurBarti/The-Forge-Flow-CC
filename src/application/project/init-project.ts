import { createProject, type Project } from "../../domain/entities/project.js";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { projectExistsError } from "../../domain/errors/project-exists.error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { ProjectStore } from "../../domain/ports/project-store.port.js";

import { Err, isOk, Ok, type Result } from "../../domain/result.js";
import { MILESTONES_DIR, PROJECT_FILE, TFF_CC_DIR } from "../../shared/paths.js";

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
	if (await deps.artifactStore.exists(PROJECT_FILE)) return Err(projectExistsError(input.name));

	const existing = deps.projectStore.getProject();
	if (!isOk(existing)) return existing;
	if (existing.data !== null) return Err(projectExistsError(input.name));

	const project = createProject(input);

	const saveResult = deps.projectStore.saveProject({ name: project.name, vision: project.vision });
	if (!isOk(saveResult)) return saveResult;

	await deps.artifactStore.mkdir(TFF_CC_DIR);
	await deps.artifactStore.mkdir(MILESTONES_DIR);

	// Ensure .tff-cc/ and build/ are in .gitignore so artifacts never land on code branches
	await ensureGitignored(deps.artifactStore);

	const projectMd = `# ${project.name}\n\n## Vision\n\n${project.vision}\n`;
	await deps.artifactStore.write(PROJECT_FILE, projectMd);

	return Ok({ project: saveResult.data });
};

// Root-anchored, no trailing slash: matches the toplevel `.tff-cc` whether it
// is the canonical symlink, a real dir, or a regular file. The trailing-slash
// form (`/.tff-cc/`) only matches directories, so it would silently fail to
// ignore the symlink that `project:init` creates. Anchoring with `/` ensures
// a stray `<some-dir>/.tff-cc/` (e.g., test pollution in a subdir) is NOT
// hidden — it surfaces in `git status` instead of being masked.
const REQUIRED_GITIGNORE_ENTRIES = [`/${TFF_CC_DIR}`, "build/"];

function gitignoreLineSatisfies(line: string, entry: string): boolean {
	const trimmed = line.trim();
	if (trimmed === "" || trimmed.startsWith("#")) return false;
	// Accept any of: `entry`, no-trailing-slash, no-leading-slash, both stripped.
	const stripped = entry.replace(/^\//, "").replace(/\/$/, "");
	return (
		trimmed === entry ||
		trimmed === entry.replace(/\/$/, "") ||
		trimmed === stripped ||
		trimmed === `${stripped}/`
	);
}

async function ensureGitignored(artifactStore: ArtifactStore): Promise<void> {
	const gitignorePath = ".gitignore";

	let existing = "";
	if (await artifactStore.exists(gitignorePath)) {
		const readResult = await artifactStore.read(gitignorePath);
		if (isOk(readResult)) existing = readResult.data;
	}

	const lines = existing.split("\n");
	const missing = REQUIRED_GITIGNORE_ENTRIES.filter(
		(entry) => !lines.some((line) => gitignoreLineSatisfies(line, entry)),
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
