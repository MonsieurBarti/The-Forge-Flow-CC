import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";
import { sliceDir } from "../../shared/paths.js";

export interface CheckpointData {
	sliceId: string;
	baseCommit: string;
	currentWave: number;
	completedWaves: number[];
	completedTasks: string[];
	executorLog: Array<{ taskRef: string; agent: string }>;
}

interface SaveCheckpointDeps {
	artifactStore: ArtifactStore;
}

/**
 * Pure: derive the on-disk path and rendered content for a CHECKPOINT.md given
 * the checkpoint data. Used by withTransaction-based callers that must stage
 * writes to *.tmp paths before a transaction opens.
 *
 * The sliceId is expected to be a display label (e.g. "M01-S01") so we can
 * derive the milestone directory. UUIDs fall back to "M01" for compatibility
 * with the previous behavior.
 */
export const renderCheckpoint = (
	data: CheckpointData,
): { dir: string; path: string; content: string } => {
	const lines: string[] = [
		`# Checkpoint — ${data.sliceId}`,
		`- Base commit: ${data.baseCommit}`,
		`- Current wave: ${data.currentWave}`,
		`- Completed waves: [${data.completedWaves.join(", ")}]`,
		`- Completed tasks: [${data.completedTasks.join(", ")}]`,
		`- Executor log: ${data.executorLog.map((e) => `${e.agent}→${e.taskRef}`).join(", ")}`,
		"",
		`<!-- checkpoint-json: ${JSON.stringify(data)} -->`,
		"",
	];
	const milestoneId = data.sliceId.match(/^(M\d+)/)?.[1] ?? "M01";
	const dir = sliceDir(milestoneId, data.sliceId);
	const path = `${dir}/CHECKPOINT.md`;
	return { dir, path, content: lines.join("\n") };
};

export const saveCheckpoint = async (
	data: CheckpointData,
	deps: SaveCheckpointDeps,
): Promise<Result<void, DomainError>> => {
	const { dir, path, content } = renderCheckpoint(data);

	const mkdirResult = await deps.artifactStore.mkdir(dir);
	if (!isOk(mkdirResult)) return mkdirResult;

	const writeResult = await deps.artifactStore.write(path, content);
	if (!isOk(writeResult)) return writeResult;

	return Ok(undefined);
};
