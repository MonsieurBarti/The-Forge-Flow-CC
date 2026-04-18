import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../../../src/domain/ports/project-store.port.js";
import type { SliceDependencyStore } from "../../../../src/domain/ports/slice-dependency-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import { isOk } from "../../../../src/domain/result.js";

type SliceDependencyTestAdapter = SliceDependencyStore &
	DatabaseInit &
	ProjectStore &
	MilestoneStore &
	SliceStore;

export const runSliceDependencyStoreContractTests = (
	name: string,
	createAdapter: () => SliceDependencyTestAdapter,
) => {
	describe(`SliceDependencyStore contract [${name}]`, () => {
		let store: SliceDependencyTestAdapter;
		let slice1Id: string;
		let slice2Id: string;
		let slice3Id: string;

		beforeEach(() => {
			store = createAdapter();
			store.init();
			// Seed parent chain
			store.saveProject({ name: "Test" });
			const msResult = store.createMilestone({ number: 1, name: "M1" });
			const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
			const sl1Result = store.createSlice({ milestoneId, number: 1, title: "S1" });
			const sl2Result = store.createSlice({ milestoneId, number: 2, title: "S2" });
			const sl3Result = store.createSlice({ milestoneId, number: 3, title: "S3" });
			slice1Id = isOk(sl1Result) ? sl1Result.data.id : "S01";
			slice2Id = isOk(sl2Result) ? sl2Result.data.id : "S02";
			slice3Id = isOk(sl3Result) ? sl3Result.data.id : "S03";
		});

		it("addSliceDependency creates edge", () => {
			const result = store.addSliceDependency(slice1Id, slice2Id);
			expect(isOk(result)).toBe(true);
		});

		it("getSliceDependencies returns outbound and inbound edges", () => {
			store.addSliceDependency(slice1Id, slice2Id);

			const s1Deps = store.getSliceDependencies(slice1Id);
			expect(isOk(s1Deps)).toBe(true);
			if (isOk(s1Deps)) {
				expect(s1Deps.data.length).toBeGreaterThanOrEqual(1);
				expect(s1Deps.data.some((d) => d.fromId === slice1Id && d.toId === slice2Id)).toBe(true);
			}

			const s2Deps = store.getSliceDependencies(slice2Id);
			expect(isOk(s2Deps)).toBe(true);
			if (isOk(s2Deps)) {
				expect(s2Deps.data.some((d) => d.fromId === slice1Id && d.toId === slice2Id)).toBe(true);
			}
		});

		it("removeSliceDependency deletes edge", () => {
			store.addSliceDependency(slice1Id, slice2Id);
			store.removeSliceDependency(slice1Id, slice2Id);

			const result = store.getSliceDependencies(slice1Id);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});

		it("getSliceDependencies returns empty for slice with no deps", () => {
			const result = store.getSliceDependencies(slice3Id);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toHaveLength(0);
		});
	});
};

// Invoke with both adapters
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runSliceDependencyStoreContractTests("SQLiteStateAdapter", () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	return adapter;
});

runSliceDependencyStoreContractTests("InMemoryStateAdapter", () => {
	const adapter = new InMemoryStateAdapter();
	adapter.init();
	return adapter;
});
