import { describe, expect, it } from "vitest";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../../src/domain/ports/task-store.port.js";
import { Err, Ok } from "../../../../src/domain/result.js";
import {
	checkMilestoneActive,
	checkSliceStatus,
	checkTasksClosed,
} from "../../../../src/domain/state-machine/preconditions.js";

// Minimal partial stores — only stub the methods under test.
type PartialSliceStore = Pick<SliceStore, "getSlice">;
type PartialTaskStore = Pick<TaskStore, "listTasks">;
type PartialMilestoneStore = Pick<MilestoneStore, "getMilestone">;

describe("checkSliceStatus", () => {
	it("ok when actual matches expected", () => {
		const store: PartialSliceStore = {
			getSlice: (_id) =>
				Ok({
					id: "id",
					milestoneId: "m1",
					number: 1,
					title: "T",
					status: "planning",
					createdAt: new Date(),
				}),
		};
		const r = checkSliceStatus(store as SliceStore, "id", "planning");
		expect(r.ok).toBe(true);
	});

	it("violation when actual differs from expected", () => {
		const store: PartialSliceStore = {
			getSlice: (_id) =>
				Ok({
					id: "id",
					milestoneId: "m1",
					number: 1,
					title: "T",
					status: "executing",
					createdAt: new Date(),
				}),
		};
		const r = checkSliceStatus(store as SliceStore, "id", "planning");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("SLICE_STATUS_MISMATCH");
			expect(r.violations[0].expected).toBe("planning");
			expect(r.violations[0].actual).toBe("executing");
		}
	});

	it("violation when slice not found (null)", () => {
		const store: PartialSliceStore = {
			getSlice: (_id) => Ok(null),
		};
		const r = checkSliceStatus(store as SliceStore, "my-id", "planning");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("SLICE_NOT_FOUND");
			expect(r.violations[0].expected).toBe("my-id");
			expect(r.violations[0].actual).toBeNull();
		}
	});

	it("violation when store returns err", () => {
		const store: PartialSliceStore = {
			getSlice: (_id) => Err({ code: "NOT_FOUND", message: "gone", context: {} }),
		};
		const r = checkSliceStatus(store as SliceStore, "my-id", "planning");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.violations[0].code).toBe("SLICE_NOT_FOUND");
	});
});

describe("checkTasksClosed", () => {
	it("ok when all tasks are closed", () => {
		const store: PartialTaskStore = {
			listTasks: (_sliceId) =>
				Ok([
					{
						id: "t1",
						sliceId: "s1",
						number: 1,
						title: "T1",
						status: "closed",
						createdAt: new Date(),
					},
					{
						id: "t2",
						sliceId: "s1",
						number: 2,
						title: "T2",
						status: "closed",
						createdAt: new Date(),
					},
				]),
		};
		const r = checkTasksClosed(store as TaskStore, "slice-id");
		expect(r.ok).toBe(true);
	});

	it("ok when task list is empty", () => {
		const store: PartialTaskStore = {
			listTasks: (_sliceId) => Ok([]),
		};
		const r = checkTasksClosed(store as TaskStore, "slice-id");
		expect(r.ok).toBe(true);
	});

	it("violation when open tasks exist", () => {
		const store: PartialTaskStore = {
			listTasks: (_sliceId) =>
				Ok([
					{
						id: "t1",
						sliceId: "s1",
						number: 1,
						title: "T1",
						status: "open",
						createdAt: new Date(),
					},
					{
						id: "t2",
						sliceId: "s1",
						number: 2,
						title: "T2",
						status: "closed",
						createdAt: new Date(),
					},
					{
						id: "t3",
						sliceId: "s1",
						number: 3,
						title: "T3",
						status: "in_progress",
						createdAt: new Date(),
					},
				]),
		};
		const r = checkTasksClosed(store as TaskStore, "slice-id");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("TASKS_NOT_CLOSED");
			expect(r.violations[0].expected).toBe(0);
			expect(r.violations[0].actual).toBe(2);
		}
	});

	it("violation when store returns err", () => {
		const store: PartialTaskStore = {
			listTasks: (_sliceId) => Err({ code: "VALIDATION_ERROR", message: "fail", context: {} }),
		};
		const r = checkTasksClosed(store as TaskStore, "slice-id");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("TASK_LOOKUP_FAILED");
			expect(r.violations[0].expected).toBe("ok");
			expect(r.violations[0].actual).toBe("VALIDATION_ERROR");
		}
	});
});

describe("checkMilestoneActive", () => {
	// "active" = not closed (MilestoneStatus has no dedicated "active" value).
	it("ok when milestone is open (not closed)", () => {
		const store: PartialMilestoneStore = {
			getMilestone: (_id) =>
				Ok({
					id: "m1",
					projectId: "p1",
					name: "M1",
					number: 1,
					status: "open",
					branch: "b",
					createdAt: new Date(),
				}),
		};
		const r = checkMilestoneActive(store as MilestoneStore, "m1");
		expect(r.ok).toBe(true);
	});

	it("ok when milestone is in_progress (not closed)", () => {
		const store: PartialMilestoneStore = {
			getMilestone: (_id) =>
				Ok({
					id: "m1",
					projectId: "p1",
					name: "M1",
					number: 1,
					status: "in_progress",
					branch: "b",
					createdAt: new Date(),
				}),
		};
		const r = checkMilestoneActive(store as MilestoneStore, "m1");
		expect(r.ok).toBe(true);
	});

	it("violation when milestone is closed", () => {
		const store: PartialMilestoneStore = {
			getMilestone: (_id) =>
				Ok({
					id: "m1",
					projectId: "p1",
					name: "M1",
					number: 1,
					status: "closed",
					branch: "b",
					createdAt: new Date(),
				}),
		};
		const r = checkMilestoneActive(store as MilestoneStore, "m1");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("MILESTONE_NOT_ACTIVE");
			expect(r.violations[0].expected).toBe("active");
			expect(r.violations[0].actual).toBe("closed");
		}
	});

	it("violation when milestone not found (null)", () => {
		const store: PartialMilestoneStore = {
			getMilestone: (_id) => Ok(null),
		};
		const r = checkMilestoneActive(store as MilestoneStore, "m-id");
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.violations[0].code).toBe("MILESTONE_NOT_FOUND");
			expect(r.violations[0].expected).toBe("m-id");
			expect(r.violations[0].actual).toBeNull();
		}
	});

	it("violation when store returns err", () => {
		const store: PartialMilestoneStore = {
			getMilestone: (_id) => Err({ code: "NOT_FOUND", message: "gone", context: {} }),
		};
		const r = checkMilestoneActive(store as MilestoneStore, "m-id");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.violations[0].code).toBe("MILESTONE_NOT_FOUND");
	});
});
