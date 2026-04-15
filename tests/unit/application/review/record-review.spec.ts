import { beforeEach, describe, expect, it } from "vitest";
import { recordReviewUseCase } from "../../../../src/application/review/record-review.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("recordReviewUseCase", () => {
	let adapter: InMemoryStateAdapter;
	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.init();
		adapter.saveProject({ name: "test", vision: "test" });
		adapter.createMilestone({ number: 1, name: "M01" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S01", tier: "S" });
	});

	it("should record a review", async () => {
		const result = await recordReviewUseCase(
			{
				sliceId: "M01-S01",
				reviewer: "code-reviewer",
				verdict: "approved",
				type: "code",
				commitSha: "abc123",
			},
			{ reviewStore: adapter },
		);

		expect(isOk(result)).toBe(true);

		const reviews = adapter.listReviews("M01-S01");
		expect(isOk(reviews) && reviews.data.length).toBe(1);
	});
});
