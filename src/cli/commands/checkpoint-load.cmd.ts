import { loadCheckpoint } from "../../application/checkpoint/load-checkpoint.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const checkpointLoadSchema: CommandSchema = {
	name: "checkpoint:load",
	purpose: "Load a checkpoint for a slice",
	mutates: false,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
	],
	optionalFlags: [],
	examples: ["checkpoint:load --slice-id M01-S01"],
};

export const checkpointLoadCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, checkpointLoadSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId } = parsed.data as { "slice-id": string };

	const artifactStore = new MarkdownArtifactAdapter(process.cwd());
	const result = await loadCheckpoint(sliceId, { artifactStore });
	if (isOk(result)) return JSON.stringify({ ok: true, data: result.data });
	return JSON.stringify({ ok: false, error: result.error });
};
