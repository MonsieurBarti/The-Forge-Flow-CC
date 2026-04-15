import { beforeEach, describe, expect, it } from "vitest";
import { enforceFreshReviewer } from "../../../../src/application/review/enforce-fresh-reviewer.js";
import { isErr, isOk } from "../../../../src/domain/result.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("enforceFreshReviewer", () => {
	let adapter: InMemoryStateAdapter;
	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.init();
		adapter.saveProject({ name: "test", vision: "test" });
		adapter.createMilestone({ number: 1, name: "M01" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S01", tier: "S" });
	});

	it("should allow review when reviewer was not an executor", async () => {
		adapter.seedExecutors("M01-S01", ["backend-dev"]);
		const result = await enforceFreshReviewer(
			{ sliceId: "M01-S01", reviewerAgent: "code-reviewer" },
			{ taskStore: adapter, reviewStore: adapter },
		);
		expect(isOk(result)).toBe(true);
	});

	it("should block review when reviewer was an executor", async () => {
		adapter.seedExecutors("M01-S01", ["backend-dev", "frontend-dev"]);
		const result = await enforceFreshReviewer(
			{ sliceId: "M01-S01", reviewerAgent: "backend-dev" },
			{ taskStore: adapter, reviewStore: adapter },
		);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) expect(result.error.code).toBe("FRESH_REVIEWER_VIOLATION");
	});

	it("should allow review when no executors recorded", async () => {
		const result = await enforceFreshReviewer(
			{ sliceId: "M01-S01", reviewerAgent: "code-reviewer" },
			{ taskStore: adapter, reviewStore: adapter },
		);
		expect(isOk(result)).toBe(true);
	});
});
