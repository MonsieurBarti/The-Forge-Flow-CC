import { saveCheckpoint } from "../../application/checkpoint/save-checkpoint.js";
import { isOk } from "../../domain/result.js";
import { MarkdownArtifactAdapter } from "../../infrastructure/adapters/filesystem/markdown-artifact.adapter.js";

const USAGE =
	'Usage: checkpoint:save \'{"sliceId":"M01-S01","baseCommit":"abc123","currentWave":0,"completedWaves":[],"completedTasks":[],"executorLog":[]}\'';

export const checkpointSaveCmd = async (args: string[]): Promise<string> => {
	const [dataJson] = args;
	if (!dataJson) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: USAGE } });
	}
	let data: unknown;
	try {
		data = JSON.parse(dataJson);
	} catch {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Invalid JSON. ${USAGE}` },
		});
	}
	if (typeof (data as Record<string, unknown>)?.sliceId !== "string") {
		return JSON.stringify({
			ok: false,
			error: { code: "INVALID_ARGS", message: `Missing required field "sliceId". ${USAGE}` },
		});
	}
	const artifactStore = new MarkdownArtifactAdapter(process.cwd());
	const result = await saveCheckpoint(data as Parameters<typeof saveCheckpoint>[0], {
		artifactStore,
	});
	if (isOk(result)) return JSON.stringify({ ok: true, data: null });
	return JSON.stringify({ ok: false, error: result.error });
};
