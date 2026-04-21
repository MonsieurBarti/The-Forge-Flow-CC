import { describe, expect, it } from "vitest";
import {
	createMockDatabaseInit,
	createMockDependencyStore,
	createMockJournalRepository,
	createMockMilestoneStore,
	createMockProjectStore,
	createMockReviewStore,
	createMockSessionStore,
	createMockSliceDependencyStore,
	createMockSliceStore,
	createMockStateStores,
	createMockTaskStore,
	err,
	ok,
	okVoid,
} from "../../helpers/mock-stores.js";

describe("mock-stores helpers", () => {
	describe("result helpers", () => {
		it("ok wraps data in a successful result", () => {
			const r = ok("hello");
			expect(r.ok).toBe(true);
			expect(r.data).toBe("hello");
		});

		it("okVoid returns an ok result with undefined data", () => {
			const r = okVoid();
			expect(r.ok).toBe(true);
			expect(r.data).toBeUndefined();
		});

		it("err wraps an error in a failed result", () => {
			const r = err({ code: "NOT_FOUND", message: "missing" });
			expect(r.ok).toBe(false);
			expect(r.error).toMatchObject({ code: "NOT_FOUND" });
		});
	});

	describe("individual store factories", () => {
		it("createMockSliceStore returns an object with stub methods", () => {
			const store = createMockSliceStore();
			expect(typeof store.createSlice).toBe("function");
			expect(typeof store.listSlices).toBe("function");
		});

		it("createMockMilestoneStore returns an object with stub methods", () => {
			const store = createMockMilestoneStore();
			expect(typeof store.createMilestone).toBe("function");
			expect(typeof store.listMilestones).toBe("function");
		});

		it("createMockTaskStore returns an object with stub methods", () => {
			const store = createMockTaskStore();
			expect(typeof store.createTask).toBe("function");
			expect(typeof store.listTasks).toBe("function");
		});

		it("createMockProjectStore returns an object with stub methods", () => {
			const store = createMockProjectStore();
			expect(typeof store.getProject).toBe("function");
			expect(typeof store.saveProject).toBe("function");
		});

		it("createMockDependencyStore returns an object with stub methods", () => {
			const store = createMockDependencyStore();
			expect(typeof store.addDependency).toBe("function");
		});

		it("createMockSliceDependencyStore returns an object with stub methods", () => {
			const store = createMockSliceDependencyStore();
			expect(typeof store.addSliceDependency).toBe("function");
		});

		it("createMockSessionStore returns an object with stub methods", () => {
			const store = createMockSessionStore();
			expect(typeof store.getSession).toBe("function");
		});

		it("createMockReviewStore returns an object with stub methods", () => {
			const store = createMockReviewStore();
			expect(typeof store.recordReview).toBe("function");
		});

		it("createMockJournalRepository returns an object with stub methods", () => {
			const repo = createMockJournalRepository();
			expect(typeof repo.append).toBe("function");
		});

		it("createMockDatabaseInit has a pass-through transaction", () => {
			const db = createMockDatabaseInit();
			const result = db.transaction(() => "transacted");
			expect(result).toBe("transacted");
		});
	});

	describe("createMockStateStores", () => {
		it("returns a complete StateStores object", () => {
			const stores = createMockStateStores();
			expect(stores.db).toBeDefined();
			expect(stores.projectStore).toBeDefined();
			expect(stores.milestoneStore).toBeDefined();
			expect(stores.sliceStore).toBeDefined();
			expect(stores.taskStore).toBeDefined();
			expect(stores.dependencyStore).toBeDefined();
			expect(stores.sliceDependencyStore).toBeDefined();
			expect(stores.sessionStore).toBeDefined();
			expect(stores.reviewStore).toBeDefined();
			expect(stores.journalRepository).toBeDefined();
		});
	});
});
