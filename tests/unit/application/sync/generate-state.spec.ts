import { beforeEach, describe, expect, it } from "vitest";
import { generateState, renderStateMd } from "../../../../src/application/sync/generate-state.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("generateState", () => {
	let adapter: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;
	let milestoneId: string;
	let slice1Id: string;
	let slice2Id: string;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		artifactStore = new InMemoryArtifactStore();
		adapter.saveProject({ name: "Test", vision: "v" });
		const msResult = adapter.createMilestone({ number: 1, name: "MVP" });
		milestoneId = isOk(msResult) ? msResult.data.id : "M01";
	});

	it("should generate STATE.md with slice progress", async () => {
		const sl1Result = adapter.createSlice({ milestoneId, number: 1, title: "Auth" });
		slice1Id = isOk(sl1Result) ? sl1Result.data.id : "M01-S01";
		const sl2Result = adapter.createSlice({ milestoneId, number: 2, title: "Billing" });
		slice2Id = isOk(sl2Result) ? sl2Result.data.id : "M01-S02";

		adapter.transitionSlice(slice1Id, "researching");
		adapter.transitionSlice(slice1Id, "planning");
		adapter.transitionSlice(slice1Id, "executing");
		adapter.transitionSlice(slice1Id, "reviewing");
		adapter.transitionSlice(slice1Id, "completing");
		adapter.transitionSlice(slice1Id, "closed");
		adapter.transitionSlice(slice2Id, "researching");
		adapter.transitionSlice(slice2Id, "planning");
		adapter.transitionSlice(slice2Id, "executing");
		adapter.createTask({ sliceId: slice1Id, number: 1, title: "Login", wave: 1 });
		adapter.createTask({ sliceId: slice1Id, number: 2, title: "Signup", wave: 1 });
		adapter.closeTask(`${slice1Id}-T01`);
		adapter.closeTask(`${slice1Id}-T02`);
		adapter.createTask({ sliceId: slice2Id, number: 1, title: "Payment", wave: 1 });
		adapter.createTask({ sliceId: slice2Id, number: 2, title: "Invoice", wave: 1 });
		adapter.claimTask(`${slice2Id}-T01`);

		const result = await generateState(
			{ milestoneId },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
		const content = await artifactStore.read(".tff-cc/STATE.md");
		expect(isOk(content)).toBe(true);
		if (isOk(content)) {
			expect(content.data).toContain("# State — MVP");
			expect(content.data).toContain("Auth");
			expect(content.data).toContain("Billing");
		}
	});

	it("should handle empty milestone", async () => {
		const result = await generateState(
			{ milestoneId },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
	});
});

describe("renderStateMd", () => {
	it("returns NOT_FOUND when milestone id does not exist", () => {
		const adapter = new InMemoryStateAdapter();
		adapter.init();
		adapter.saveProject({ name: "Test" });

		const result = renderStateMd(
			{ milestoneId: "nonexistent-id" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter },
		);
		expect(isOk(result)).toBe(false);
		if (isOk(result)) throw new Error("expected error");
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("returns error when getMilestone store call fails (line 32 branch)", () => {
		const failingMilestoneStore = {
			getMilestone: () => ({
				ok: false as const,
				error: { code: "WRITE_FAILURE" as const, message: "db fail" },
			}),
			listMilestones: () => ({ ok: true as const, data: [] }),
			getMilestoneByNumber: () => ({ ok: true as const, data: null }),
			createMilestone: () => ({ ok: true as const, data: {} }),
			updateMilestone: () => ({ ok: true as const, data: {} }),
			closeMilestone: () => ({ ok: true as const, data: {} }),
		};
		const adapter = new InMemoryStateAdapter();
		adapter.init();

		const result = renderStateMd(
			{ milestoneId: "any-id" },
			{ milestoneStore: failingMilestoneStore as never, sliceStore: adapter, taskStore: adapter },
		);
		expect(isOk(result)).toBe(false);
	});
});

describe("generateState — kind scope", () => {
	let adapter: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		artifactStore = new InMemoryArtifactStore();
		adapter.saveProject({ name: "Test", vision: "v" });
	});

	it("renders quick STATE with no slices and writes to .tff-cc/quick/STATE.md", async () => {
		const result = await generateState(
			{ scope: "kind", kind: "quick" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
		const content = await artifactStore.read(".tff-cc/quick/STATE.md");
		expect(isOk(content)).toBe(true);
		if (isOk(content)) {
			expect(content.data).toContain("# State — Quick Slices");
			expect(content.data).toContain("Slices: 0/0 completed");
		}
	});

	it("renders debug STATE and writes to .tff-cc/debug/STATE.md", async () => {
		const result = await generateState(
			{ scope: "kind", kind: "debug" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
		const content = await artifactStore.read(".tff-cc/debug/STATE.md");
		expect(isOk(content)).toBe(true);
		if (isOk(content)) {
			expect(content.data).toContain("# State — Debug Slices");
		}
	});

	it("renders quick STATE with mixed-status slices using Q-## labels", async () => {
		const q1 = adapter.createSlice({ kind: "quick", number: 1, title: "Quick One" });
		const q2 = adapter.createSlice({ kind: "quick", number: 2, title: "Quick Two" });
		const q1Id = isOk(q1) ? q1.data.id : "";
		const q2Id = isOk(q2) ? q2.data.id : "";

		// q1 → completing (closed requires approved reviews — completing exercises mixed-status path)
		adapter.transitionSlice(q1Id, "researching");
		adapter.transitionSlice(q1Id, "planning");
		adapter.transitionSlice(q1Id, "executing");
		adapter.transitionSlice(q1Id, "verifying");
		adapter.transitionSlice(q1Id, "reviewing");
		adapter.transitionSlice(q1Id, "completing");
		// q2 → executing
		adapter.transitionSlice(q2Id, "researching");
		adapter.transitionSlice(q2Id, "planning");
		adapter.transitionSlice(q2Id, "executing");

		adapter.createTask({ sliceId: q1Id, number: 1, title: "T1", wave: 1 });
		adapter.closeTask(`${q1Id}-T01`);
		adapter.createTask({ sliceId: q2Id, number: 1, title: "T1", wave: 1 });

		const result = await generateState(
			{ scope: "kind", kind: "quick" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
		const content = await artifactStore.read(".tff-cc/quick/STATE.md");
		expect(isOk(content)).toBe(true);
		if (isOk(content)) {
			expect(content.data).toContain("Q-01");
			expect(content.data).toContain("Q-02");
			expect(content.data).toContain("Quick One");
			expect(content.data).toContain("Quick Two");
			expect(content.data).toContain("completing");
			expect(content.data).toContain("executing");
		}
	});

	it("does not write to milestone STATE_FILE when scope is kind", async () => {
		await generateState(
			{ scope: "kind", kind: "quick" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		const milestoneState = await artifactStore.read(".tff-cc/STATE.md");
		expect(isOk(milestoneState)).toBe(false);
	});
});
