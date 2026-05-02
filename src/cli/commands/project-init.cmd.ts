import { initProject } from "../../application/project/init-project.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createStateStores } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { resolveProjectRoot, resolveRepoRoot } from "../../infrastructure/home-directory.js";
import { installPostCheckoutHook } from "../../infrastructure/hooks/install-post-checkout.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const projectInitSchema: CommandSchema = {
	name: "project:init",
	purpose: "Initialize a new TFF project",
	mutates: true,
	requiredFlags: [
		{
			name: "name",
			type: "string",
			description: "Project name",
		},
	],
	optionalFlags: [
		{
			name: "vision",
			type: "string",
			description: "Project vision statement",
		},
	],
	examples: [
		'project:init --name "My Project"',
		'project:init --name "My Project" --vision "Build the best thing"',
	],
};

export const projectInitCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, projectInitSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { name, vision } = parsed.data as { name: string; vision?: string };
	const finalVision = vision || name;

	const repoRoot = resolveRepoRoot(process.cwd());
	const projectRoot = resolveProjectRoot(process.cwd());
	// Note: .tff-cc/ symlink is created by getProjectId() called from createStateStores()
	const { projectStore } = createStateStores();
	const artifactStore = new MarkdownArtifactAdapter(projectRoot);
	const _gitOps = new GitCliAdapter(repoRoot);

	const result = await initProject({ name, vision: finalVision }, { projectStore, artifactStore });
	if (isOk(result)) {
		// Skip writing into the surrounding worktree's `.git/hooks/` when
		// running against an isolated TFF_CC_HOME sandbox — the hook is a
		// real-repo concern and would leak into cwd otherwise.
		if (!process.env.TFF_CC_HOME) {
			try {
				installPostCheckoutHook(repoRoot);
			} catch {
				// Hook installation is best-effort
			}
		}
		return JSON.stringify({ ok: true, data: result.data });
	}
	return JSON.stringify({ ok: false, error: result.error });
};
