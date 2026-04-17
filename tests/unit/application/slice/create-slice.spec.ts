import { beforeEach, describe, expect, it } from "vitest";
import { createSliceUseCase } from "../../../../src/application/slice/create-slice.js";
import { isOk } from "../../../../src/domain/result.js";
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

	it("should create a slice with UUID id", async () => {
		// Get the milestone ID (which is now a UUID)
		const milestones = state.listMilestones();
		const milestoneId = isOk(milestones) && milestones.data[0] ? milestones.data[0].id : "M01";

		const result = await createSliceUseCase(
			{ milestoneId, title: "Auth" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const { slice } = result.data;
			expect(slice.title).toBe("Auth");
			// ID should be a UUID
			expect(slice.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			expect(slice.status).toBe("discussing");
		}
	});

	it("should create slice directory with label format", async () => {
		// Get the milestone ID (which is now a UUID)
		const milestones = state.listMilestones();
		const milestoneId = isOk(milestones) && milestones.data[0] ? milestones.data[0].id : "M01";

		const result = await createSliceUseCase(
			{ milestoneId, title: "Auth" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Directory uses label format M##-S##, not UUID
			expect(await artifactStore.exists(".tff-cc/milestones/M01/slices/M01-S01/PLAN.md")).toBe(true);
		}
	});

	it("should auto-increment slice numbers", async () => {
		// Get the milestone ID (which is now a UUID)
		const milestones = state.listMilestones();
		const milestoneId = isOk(milestones) && milestones.data[0] ? milestones.data[0].id : "M01";

		const result1 = await createSliceUseCase(
			{ milestoneId, title: "Auth" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);
		const result2 = await createSliceUseCase(
			{ milestoneId, title: "Profile" },
			{ milestoneStore: state, sliceStore: state, artifactStore },
		);

		expect(isOk(result1)).toBe(true);
		expect(isOk(result2)).toBe(true);
		if (isOk(result1) && isOk(result2)) {
			expect(result1.data.slice.number).toBe(1);
			expect(result2.data.slice.number).toBe(2);
			// Directories should be M01-S01 and M01-S02
			expect(await artifactStore.exists(".tff-cc/milestones/M01/slices/M01-S01/PLAN.md")).toBe(true);
			expect(await artifactStore.exists(".tff-cc/milestones/M01/slices/M01-S02/PLAN.md")).toBe(true);
		}
	});
});
