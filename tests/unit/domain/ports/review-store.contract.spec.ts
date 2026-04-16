import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { ReviewStore } from "../../../../src/domain/ports/review-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../../src/domain/ports/task-store.port.js";
import { isOk } from "../../../../src/domain/result.js";

type FullAdapter = ReviewStore &
	TaskStore &
	SliceStore &
	MilestoneStore &
	ProjectStore &
	DatabaseInit;

export const runReviewStoreContractTests = (name: string, createAdapter: () => FullAdapter) => {
	describe(`ReviewStore contract [${name}]`, () => {
		let store: FullAdapter;
		let sliceId: string;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			store.saveProject({ name: "Test Project" });
			const msResult = store.createMilestone({ number: 1, name: "M1" });
			const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
			const slResult = store.createSlice({ milestoneId, number: 1, title: "S01" });
			sliceId = isOk(slResult) ? slResult.data.id : "M01-S01";
		});

		// ReviewStore tests

		it("recordReview + listReviews round-trip", () => {
			const review = {
				sliceId,
				type: "code" as const,
				reviewer: "agent-1",
				verdict: "approved" as const,
				commitSha: "abc123",
				createdAt: "2026-01-01T00:00:00.000Z",
			};
			const recordResult = store.recordReview(review);
			expect(isOk(recordResult)).toBe(true);

			const listResult = store.listReviews(sliceId);
			expect(isOk(listResult)).toBe(true);
			if (isOk(listResult)) {
				expect(listResult.data).toHaveLength(1);
				expect(listResult.data[0].sliceId).toBe(sliceId);
				expect(listResult.data[0].type).toBe("code");
				expect(listResult.data[0].reviewer).toBe("agent-1");
				expect(listResult.data[0].verdict).toBe("approved");
				expect(listResult.data[0].commitSha).toBe("abc123");
			}
		});

		it("getLatestReview returns most recent by type", () => {
			const older = {
				sliceId,
				type: "security" as const,
				reviewer: "agent-1",
				verdict: "changes_requested" as const,
				commitSha: "sha-old",
				createdAt: "2026-01-01T00:00:00.000Z",
			};
			const newer = {
				sliceId,
				type: "security" as const,
				reviewer: "agent-2",
				verdict: "approved" as const,
				commitSha: "sha-new",
				createdAt: "2026-01-02T00:00:00.000Z",
			};
			store.recordReview(older);
			store.recordReview(newer);

			const result = store.getLatestReview(sliceId, "security");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.commitSha).toBe("sha-new");
				expect(result.data!.reviewer).toBe("agent-2");
			}
		});

		it("getLatestReview returns null when no reviews exist", () => {
			const result = store.getLatestReview(sliceId, "spec");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeNull();
			}
		});

		it("listReviews returns empty array for unknown slice", () => {
			const result = store.listReviews("unknown-slice-uuid");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});

		it("recordReview stores optional notes field", () => {
			const review = {
				sliceId,
				type: "spec" as const,
				reviewer: "agent-3",
				verdict: "changes_requested" as const,
				commitSha: "sha-notes",
				notes: "Please fix the edge case",
				createdAt: "2026-01-03T00:00:00.000Z",
			};
			store.recordReview(review);

			const result = store.listReviews(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data[0].notes).toBe("Please fix the edge case");
			}
		});

		it("listReviews only returns reviews for the specified slice", () => {
			const sl2Result = store.createSlice({ milestoneId: store.listMilestones().data?.[0]?.id ?? "M01", number: 2, title: "S02" });
			const slice2Id = isOk(sl2Result) ? sl2Result.data.id : "M01-S02";

			store.recordReview({
				sliceId,
				type: "code" as const,
				reviewer: "agent-1",
				verdict: "approved" as const,
				commitSha: "sha-s01",
				createdAt: "2026-01-01T00:00:00.000Z",
			});
			store.recordReview({
				sliceId: slice2Id,
				type: "code" as const,
				reviewer: "agent-1",
				verdict: "approved" as const,
				commitSha: "sha-s02",
				createdAt: "2026-01-01T00:00:00.000Z",
			});

			const result = store.listReviews(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0].sliceId).toBe(sliceId);
			}
		});
	});

	describe(`TaskStore.claimTask + getExecutorsForSlice contract [${name}]`, () => {
		let store: FullAdapter;
		let sliceId: string;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			store.saveProject({ name: "Test Project" });
			const msResult = store.createMilestone({ number: 1, name: "M1" });
			const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
			const slResult = store.createSlice({ milestoneId, number: 1, title: "S01" });
			sliceId = isOk(slResult) ? slResult.data.id : "M01-S01";
		});

		it("claimTask with claimedBy stores agent identity", () => {
			store.createTask({ sliceId, number: 1, title: "Task" });
			const claimResult = store.claimTask(`${sliceId}-T01`, "agent-executor-1");
			expect(isOk(claimResult)).toBe(true);

			const taskResult = store.getTask(`${sliceId}-T01`);
			expect(isOk(taskResult)).toBe(true);
			if (isOk(taskResult)) {
				expect(taskResult.data!.status).toBe("in_progress");
				expect(taskResult.data!.claimedBy).toBe("agent-executor-1");
			}
		});

		it("getExecutorsForSlice returns distinct agents", () => {
			store.createTask({ sliceId, number: 1, title: "T1" });
			store.createTask({ sliceId, number: 2, title: "T2" });
			store.createTask({ sliceId, number: 3, title: "T3" });

			store.claimTask(`${sliceId}-T01`, "agent-alpha");
			store.claimTask(`${sliceId}-T02`, "agent-beta");
			store.claimTask(`${sliceId}-T03`, "agent-alpha"); // duplicate agent

			const result = store.getExecutorsForSlice(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(2);
				expect(result.data).toContain("agent-alpha");
				expect(result.data).toContain("agent-beta");
			}
		});

		it("getExecutorsForSlice returns empty array for unclaimed tasks", () => {
			store.createTask({ sliceId, number: 1, title: "Unclaimed Task" });

			const result = store.getExecutorsForSlice(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});

		it("getExecutorsForSlice returns empty array when no tasks exist for slice", () => {
			const result = store.getExecutorsForSlice("unknown-slice-uuid");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});
	});
};

import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runReviewStoreContractTests("SQLiteStateAdapter", () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	return adapter;
});

runReviewStoreContractTests("InMemoryStateAdapter", () => {
	const adapter = new InMemoryStateAdapter();
	adapter.init();
	return adapter;
});
