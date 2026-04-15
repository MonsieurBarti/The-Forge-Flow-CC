import { beforeEach, describe, expect, it } from "vitest";
import { createSliceUseCase } from "../../../../src/application/slice/create-slice.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("createSliceUseCase", () => {
	let state: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;

	beforeEach(() => {
		state = new InMemoryStateAdapter();
		artifactStore = new InMemoryArtifactStore();
		// Seed project and milestone
		state.saveProject({ name: "Test Project", vision: "Test vision" });
		state.createMilestone({ number: 1, name: "Milestone 1" });
	});

	it("should create a slice with markdown", async () => {
		const result = await createSliceUseCase(
			{ milestoneId: "M01", title: "Auth" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.slice.title).toBe("Auth");
			expect(result.data.slice.id).toBe("M01-S01");
			expect(result.data.slice.status).toBe("discussing");
		}
	});

	it("should create slice directory", async () => {
		await createSliceUseCase(
			{ milestoneId: "M01", title: "Auth" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);

		expect(await artifactStore.exists(".tff/milestones/M01/slices/M01-S01/PLAN.md")).toBe(true);
	});
});
