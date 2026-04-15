import { beforeEach, describe, expect, it } from "vitest";
import { generateState } from "../../../../src/application/sync/generate-state.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryArtifactStore } from "../../../../src/infrastructure/testing/in-memory-artifact-store.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("generateState", () => {
	let adapter: InMemoryStateAdapter;
	let artifactStore: InMemoryArtifactStore;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		artifactStore = new InMemoryArtifactStore();
		adapter.saveProject({ name: "Test", vision: "v" });
	});

	it("should generate STATE.md with slice progress", async () => {
		adapter.createMilestone({ number: 1, name: "MVP" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "Auth" });
		adapter.createSlice({ milestoneId: "M01", number: 2, title: "Billing" });
		adapter.transitionSlice("M01-S01", "researching");
		adapter.transitionSlice("M01-S01", "planning");
		adapter.transitionSlice("M01-S01", "executing");
		adapter.transitionSlice("M01-S01", "reviewing");
		adapter.transitionSlice("M01-S01", "completing");
		adapter.transitionSlice("M01-S01", "closed");
		adapter.transitionSlice("M01-S02", "researching");
		adapter.transitionSlice("M01-S02", "planning");
		adapter.transitionSlice("M01-S02", "executing");
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Login", wave: 1 });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "Signup", wave: 1 });
		adapter.closeTask("M01-S01-T01");
		adapter.closeTask("M01-S01-T02");
		adapter.createTask({ sliceId: "M01-S02", number: 1, title: "Payment", wave: 1 });
		adapter.createTask({ sliceId: "M01-S02", number: 2, title: "Invoice", wave: 1 });
		adapter.claimTask("M01-S02-T01");

		const result = await generateState(
			{ milestoneId: "M01" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
		const content = await artifactStore.read(".tff/STATE.md");
		expect(isOk(content)).toBe(true);
		if (isOk(content)) {
			expect(content.data).toContain("# State — MVP");
			expect(content.data).toContain("Auth");
			expect(content.data).toContain("Billing");
		}
	});

	it("should handle empty milestone", async () => {
		adapter.createMilestone({ number: 1, name: "MVP" });
		const result = await generateState(
			{ milestoneId: "M01" },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter, artifactStore },
		);
		expect(isOk(result)).toBe(true);
	});
});
