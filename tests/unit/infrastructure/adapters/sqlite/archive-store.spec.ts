import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../../src/infrastructure/testing/in-memory-state-adapter.js";

const makeAdapters = () => {
	const sqlite = SQLiteStateAdapter.createInMemory();
	sqlite.init();
	const memory = new InMemoryStateAdapter();
	memory.init();
	return [
		{ name: "sqlite", adapter: sqlite as SQLiteStateAdapter | InMemoryStateAdapter },
		{ name: "in-memory", adapter: memory as SQLiteStateAdapter | InMemoryStateAdapter },
	] as const;
};

describe("archive store behavior", () => {
	for (const { name, adapter } of makeAdapters()) {
		describe(name, () => {
			adapter.saveProject({ name: "P" });
			const milestone = adapter.createMilestone({ number: 1, name: "M1" });
			expect(milestone.ok).toBe(true);
			if (!milestone.ok) throw new Error("milestone");
			const mId = milestone.data.id;
			const sliceA = adapter.createSlice({
				milestoneId: mId,
				number: 1,
				title: "S1",
				kind: "milestone",
			});
			const sliceB = adapter.createSlice({
				milestoneId: mId,
				number: 2,
				title: "S2",
				kind: "milestone",
			});
			expect(sliceA.ok && sliceB.ok).toBe(true);
			if (!sliceA.ok || !sliceB.ok) throw new Error("slice");
			const quick = adapter.createSlice({
				number: 1,
				title: "Q1",
				kind: "quick",
			});
			expect(quick.ok).toBe(true);
			if (!quick.ok) throw new Error("quick");

			it("archiveSlice sets archivedAt and is idempotent", () => {
				const r1 = adapter.archiveSlice(sliceA.data.id);
				expect(r1.ok).toBe(true);

				const after = adapter.getSlice(sliceA.data.id);
				expect(after.ok).toBe(true);
				if (!after.ok || !after.data) throw new Error("after");
				expect(after.data.archivedAt).toBeInstanceOf(Date);
				const firstStamp = after.data.archivedAt;

				const r2 = adapter.archiveSlice(sliceA.data.id);
				expect(r2.ok).toBe(true);

				const after2 = adapter.getSlice(sliceA.data.id);
				if (!after2.ok || !after2.data) throw new Error("after2");
				// Idempotent: second call must not change the stamp
				expect(after2.data.archivedAt?.getTime()).toBe(firstStamp?.getTime());
			});

			it("listSlices excludes archived rows by default", () => {
				const def = adapter.listSlices(mId);
				if (!def.ok) throw new Error("def");
				const ids = def.data.map((s) => s.id);
				expect(ids).toContain(sliceB.data.id);
				expect(ids).not.toContain(sliceA.data.id);
			});

			it("listSlices({ includeArchived: true }) returns archived rows", () => {
				const all = adapter.listSlices({ milestoneId: mId, includeArchived: true });
				if (!all.ok) throw new Error("all");
				const ids = all.data.map((s) => s.id);
				expect(ids).toContain(sliceA.data.id);
				expect(ids).toContain(sliceB.data.id);
			});

			it("listSlicesByKind excludes archived rows by default", () => {
				const archiveR = adapter.archiveSlice(quick.data.id);
				expect(archiveR.ok).toBe(true);

				const def = adapter.listSlicesByKind("quick");
				if (!def.ok) throw new Error("def");
				const ids = def.data.map((s) => s.id);
				expect(ids).not.toContain(quick.data.id);

				const all = adapter.listSlicesByKind("quick", { includeArchived: true });
				if (!all.ok) throw new Error("all");
				const idsAll = all.data.map((s) => s.id);
				expect(idsAll).toContain(quick.data.id);
			});
		});
	}

	describe("archiveMilestoneCascade", () => {
		for (const flavor of ["sqlite", "in-memory"] as const) {
			it(`archives milestone and all child slices in one tx [${flavor}]`, () => {
				const adapter: SQLiteStateAdapter | InMemoryStateAdapter =
					flavor === "sqlite"
						? (() => {
								const a = SQLiteStateAdapter.createInMemory();
								a.init();
								return a;
							})()
						: (() => {
								const a = new InMemoryStateAdapter();
								a.init();
								return a;
							})();
				adapter.saveProject({ name: "P" });
				const m = adapter.createMilestone({ number: 1, name: "M1" });
				if (!m.ok) throw new Error("m");
				const s1 = adapter.createSlice({
					milestoneId: m.data.id,
					number: 1,
					title: "S1",
					kind: "milestone",
				});
				const s2 = adapter.createSlice({
					milestoneId: m.data.id,
					number: 2,
					title: "S2",
					kind: "milestone",
				});
				if (!s1.ok || !s2.ok) throw new Error("slice");

				const r = adapter.archiveMilestoneCascade(m.data.id);
				expect(r.ok).toBe(true);
				if (!r.ok) throw new Error("r");
				expect(r.data.slicesArchived).toBe(2);

				// Milestone is excluded by default
				const milestonesDefault = adapter.listMilestones();
				if (!milestonesDefault.ok) throw new Error("listMs");
				expect(milestonesDefault.data.find((x) => x.id === m.data.id)).toBeUndefined();

				// Milestone is present with includeArchived
				const milestonesAll = adapter.listMilestones({ includeArchived: true });
				if (!milestonesAll.ok) throw new Error("listMsAll");
				const found = milestonesAll.data.find((x) => x.id === m.data.id);
				expect(found?.archivedAt).toBeInstanceOf(Date);

				// All child slices archived
				const slicesAll = adapter.listSlices({
					milestoneId: m.data.id,
					includeArchived: true,
				});
				if (!slicesAll.ok) throw new Error("slicesAll");
				expect(slicesAll.data).toHaveLength(2);
				for (const slice of slicesAll.data) {
					expect(slice.archivedAt).toBeInstanceOf(Date);
				}

				// Idempotent re-call returns 0 (nothing new to archive)
				const again = adapter.archiveMilestoneCascade(m.data.id);
				if (!again.ok) throw new Error("again");
				expect(again.data.slicesArchived).toBe(0);
			});
		}
	});
});
