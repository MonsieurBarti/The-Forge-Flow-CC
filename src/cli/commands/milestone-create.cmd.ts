import { createMilestoneUseCase } from "../../application/milestone/create-milestone.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { GitCliAdapter } from "../../infrastructure/adapters/git/git-cli.adapter.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { parseFlags, type CommandSchema } from "../utils/flag-parser.js";

export const milestoneCreateSchema: CommandSchema = {
	name: "milestone:create",
	purpose: "Create a new milestone",
	requiredFlags: [
		{
			name: "name",
			type: "string",
			description: "Milestone name",
		},
	],
	optionalFlags: [],
	examples: ['milestone:create --name "Phase 1: Core Features"'],
};

export const milestoneCreateCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCreateSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { name } = parsed.data as { name: string };

	const cwd = process.cwd();
	const { milestoneStore } = createClosableStateStoresUnchecked();
	const artifactStore = new MarkdownArtifactAdapter(cwd);
	const gitOps = new GitCliAdapter(cwd);

	// Auto-number: count existing milestones and increment
	const milestonesResult = milestoneStore.listMilestones();
	if (!isOk(milestonesResult)) {
		return JSON.stringify({ ok: false, error: milestonesResult.error });
	}
	const number = milestonesResult.data.length + 1;

	const result = await createMilestoneUseCase(
		{ name, number },
		{ milestoneStore, artifactStore, gitOps },
	);

	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
