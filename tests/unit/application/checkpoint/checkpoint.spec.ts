import { beforeEach, describe, expect, it } from "vitest";
import { loadCheckpoint } from "../../../../src/application/checkpoint/load-checkpoint.js";
import { saveCheckpoint } from "../../../../src/application/checkpoint/save-checkpoint.js";
import { isErr, isOk } from "../../../../src/domain/result.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";

describe("checkpoint", () => {
	let artifactStore: InMemoryArtifactStore;
	beforeEach(() => {
		artifactStore = new InMemoryArtifactStore();
	});

	const checkpointData = {
		sliceId: "M01-S01",
		baseCommit: "abc1234",
		currentWave: 1,
		completedWaves: [],
		completedTasks: [],
		executorLog: [],
	};

	it("saveCheckpoint writes valid checkpoint markdown", async () => {
		const result = await saveCheckpoint(checkpointData, { artifactStore });
		expect(isOk(result)).toBe(true);
	});

	it("loadCheckpoint reads saved checkpoint", async () => {
		await saveCheckpoint(checkpointData, { artifactStore });
		const result = await loadCheckpoint("M01-S01", { artifactStore });
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.sliceId).toBe("M01-S01");
			expect(result.data.baseCommit).toBe("abc1234");
		}
	});

	it("loadCheckpoint returns NOT_FOUND when checkpoint missing", async () => {
		const result = await loadCheckpoint("M99-S99", { artifactStore });
		expect(isErr(result)).toBe(true);
	});
});
