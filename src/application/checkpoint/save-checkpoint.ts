import type { DomainError } from "../../domain/errors/domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";

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

export const saveCheckpoint = async (
	data: CheckpointData,
	deps: SaveCheckpointDeps,
): Promise<Result<void, DomainError>> => {
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
	const dir = `.tff/milestones/${milestoneId}/slices/${data.sliceId}`;
	const path = `${dir}/CHECKPOINT.md`;

	const mkdirResult = await deps.artifactStore.mkdir(dir);
	if (!isOk(mkdirResult)) return mkdirResult;

	const writeResult = await deps.artifactStore.write(path, lines.join("\n"));
	if (!isOk(writeResult)) return writeResult;

	return Ok(undefined);
};
