import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import { isErr, isOk } from "../../../../src/domain/result.js";

export const runMilestoneStoreContractTests = (
	name: string,
	createAdapter: () => MilestoneStore & ProjectStore & SliceStore & DatabaseInit,
) => {
	describe(`MilestoneStore contract [${name}]`, () => {
		let store: MilestoneStore & ProjectStore & SliceStore & DatabaseInit;
		beforeEach(() => {
			store = createAdapter();
			store.init();
			store.saveProject({ name: "Test Project" });
		});

		it("createMilestone returns milestone with UUID id and branch", () => {
			const result = store.createMilestone({ number: 1, name: "MVP" });
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// ID should be a UUID
				expect(result.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
				expect(result.data.name).toBe("MVP");
				expect(result.data.number).toBe(1);
				expect(result.data.status).toBe("open");
				// Branch should be milestone/<8-char-uuid-prefix>
				expect(result.data.branch).toMatch(/^milestone\/[0-9a-f]{8}$/);
			}
		});

		it("getMilestone returns null for unknown id", () => {
			const result = store.getMilestone("nonexistent");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toBeNull();
		});

		it("getMilestone returns saved milestone", () => {
			const createResult = store.createMilestone({ number: 1, name: "MVP" });
			const milestoneId = isOk(createResult) ? createResult.data.id : "M01";
			const result = store.getMilestone(milestoneId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.name).toBe("MVP");
			}
		});

		it("listMilestones returns all", () => {
			store.createMilestone({ number: 1, name: "M1" });
			store.createMilestone({ number: 2, name: "M2" });
			const result = store.listMilestones();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toHaveLength(2);
		});

		it("updateMilestone updates name", () => {
			const createResult = store.createMilestone({ number: 1, name: "Old" });
			const milestoneId = isOk(createResult) ? createResult.data.id : "M01";
			store.updateMilestone(milestoneId, { name: "New" });
			const result = store.getMilestone(milestoneId);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data!.name).toBe("New");
		});

		it("closeMilestone sets status and reason", () => {
			const createResult = store.createMilestone({ number: 1, name: "Test" });
			const milestoneId = isOk(createResult) ? createResult.data.id : "M01";
			const closeResult = store.closeMilestone(milestoneId, "Completed");
			expect(isOk(closeResult)).toBe(true);
			const result = store.getMilestone(milestoneId);
			if (isOk(result)) {
				expect(result.data!.status).toBe("closed");
				expect(result.data!.closeReason).toBe("Completed");
			}
		});

		it("closeMilestone with no open slices succeeds", () => {
			const createResult = store.createMilestone({ number: 1, name: "Test" });
			const milestoneId = isOk(createResult) ? createResult.data.id : "M01";
			const result = store.closeMilestone(milestoneId);
			expect(isOk(result)).toBe(true);
		});

		it("closeMilestone with open slices returns HAS_OPEN_CHILDREN", () => {
			const createResult = store.createMilestone({ number: 1, name: "Test" });
			const milestoneId = isOk(createResult) ? createResult.data.id : "M01";
			store.createSlice({ milestoneId, number: 1, title: "Open Slice" });
			const result = store.closeMilestone(milestoneId);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.code).toBe("HAS_OPEN_CHILDREN");
			}
		});
	});
};

import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runMilestoneStoreContractTests("SQLiteStateAdapter", () => SQLiteStateAdapter.createInMemory());
runMilestoneStoreContractTests("InMemoryStateAdapter", () => new InMemoryStateAdapter());
