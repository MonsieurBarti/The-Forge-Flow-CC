import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import { isErr, isOk } from "../../../../src/domain/result.js";

export const runSliceStoreContractTests = (
	name: string,
	createAdapter: () => SliceStore & MilestoneStore & ProjectStore & DatabaseInit,
) => {
	describe(`SliceStore contract [${name}]`, () => {
		let store: SliceStore & MilestoneStore & ProjectStore & DatabaseInit;
		let milestoneId: string;
		let milestone2Id: string;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			store.saveProject({ name: "Test Project" });
			const msResult = store.createMilestone({ number: 1, name: "M1" });
			milestoneId = isOk(msResult) ? msResult.data.id : "M01";
			const ms2Result = store.createMilestone({ number: 2, name: "M2" });
			milestone2Id = isOk(ms2Result) ? ms2Result.data.id : "M02";
		});

		it("createSlice returns slice with UUID id", () => {
			const result = store.createSlice({ milestoneId, number: 1, title: "First Slice" });
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// ID should be a UUID
				expect(result.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
				expect(result.data.title).toBe("First Slice");
				expect(result.data.milestoneId).toBe(milestoneId);
				expect(result.data.number).toBe(1);
				expect(result.data.status).toBe("discussing");
			}
		});

		it("getSlice returns null for unknown id", () => {
			const result = store.getSlice("nonexistent");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toBeNull();
		});

		it("getSlice returns saved slice", () => {
			const createResult = store.createSlice({ milestoneId, number: 1, title: "First Slice" });
			const sliceId = isOk(createResult) ? createResult.data.id : "M01-S01";
			const result = store.getSlice(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.title).toBe("First Slice");
				expect(result.data!.id).toBe(sliceId);
			}
		});

		it("listSlices returns all slices when no milestoneId given", () => {
			store.createSlice({ milestoneId, number: 1, title: "Slice A" });
			store.createSlice({ milestoneId: milestone2Id, number: 1, title: "Slice B" });
			const result = store.listSlices();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toHaveLength(2);
		});

		it("listSlices filtered by milestoneId", () => {
			store.createSlice({ milestoneId, number: 1, title: "Slice A" });
			store.createSlice({ milestoneId: milestone2Id, number: 1, title: "Slice B" });
			const result = store.listSlices(milestoneId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0].milestoneId).toBe(milestoneId);
			}
		});

		it("updateSlice updates title", () => {
			const createResult = store.createSlice({ milestoneId, number: 1, title: "Old Title" });
			const sliceId = isOk(createResult) ? createResult.data.id : "M01-S01";
			store.updateSlice(sliceId, { title: "New Title" });
			const result = store.getSlice(sliceId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data!.title).toBe("New Title");
		});

		it("transitionSlice delegates to domain function, returns events", () => {
			const createResult = store.createSlice({ milestoneId, number: 1, title: "Slice" });
			const sliceId = isOk(createResult) ? createResult.data.id : "M01-S01";
			const result = store.transitionSlice(sliceId, "researching");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data[0].type).toBe("SLICE_STATUS_CHANGED");
			}
			const updated = store.getSlice(sliceId);
			if (isOk(updated)) expect(updated.data!.status).toBe("researching");
		});

		it("transitionSlice invalid transition returns INVALID_TRANSITION error", () => {
			const createResult = store.createSlice({ milestoneId, number: 1, title: "Slice" });
			const sliceId = isOk(createResult) ? createResult.data.id : "M01-S01";
			// 'discussing' -> 'closed' is not a valid transition
			const result = store.transitionSlice(sliceId, "closed");
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.code).toBe("INVALID_TRANSITION");
			}
		});
	});
};

import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runSliceStoreContractTests("SQLiteStateAdapter", () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	return adapter;
});

runSliceStoreContractTests("InMemoryStateAdapter", () => {
	const adapter = new InMemoryStateAdapter();
	adapter.init();
	return adapter;
});
