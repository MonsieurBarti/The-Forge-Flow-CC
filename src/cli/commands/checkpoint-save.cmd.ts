import { saveCheckpoint } from "../../application/checkpoint/save-checkpoint.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const checkpointSaveSchema: CommandSchema = {
	name: "checkpoint:save",
	purpose: "Save a checkpoint for a slice",
	mutates: true,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "base-commit",
			type: "string",
			description: "Base commit SHA",
		},
		{
			name: "current-wave",
			type: "number",
			description: "Current wave index",
		},
		{
			name: "completed-waves",
			type: "json",
			description: "JSON array of completed wave indices",
		},
		{
			name: "completed-tasks",
			type: "json",
			description: "JSON array of completed task IDs",
		},
		{
			name: "executor-log",
			type: "json",
			description: "JSON array of executor log entries",
		},
	],
	optionalFlags: [],
	examples: [
		"checkpoint:save --slice-id M01-S01 --base-commit abc123 --current-wave 0 --completed-waves '[]' --completed-tasks '[]' --executor-log '[]'",
	],
};

export const checkpointSaveCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, checkpointSaveSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const data = {
		sliceId: parsed.data["slice-id"] as string,
		baseCommit: parsed.data["base-commit"] as string,
		currentWave: parsed.data["current-wave"] as number,
		completedWaves: parsed.data["completed-waves"] as number[],
		completedTasks: parsed.data["completed-tasks"] as string[],
		executorLog: parsed.data["executor-log"] as Array<{ taskRef: string; agent: string }>,
	};

	const artifactStore = new MarkdownArtifactAdapter(process.cwd());
	const result = await saveCheckpoint(data, {
		artifactStore,
	});
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
