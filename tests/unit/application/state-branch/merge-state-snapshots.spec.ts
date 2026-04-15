import { describe, expect, it } from "vitest";
import { mergeStateSnapshots } from "../../../../src/application/state-branch/merge-state-snapshots.js";
import type { Milestone } from "../../src/domain/entities/milestone.js";
import type { Project } from "../../src/domain/entities/project.js";
import type { Slice } from "../../src/domain/entities/slice.js";
import type { Task } from "../../src/domain/entities/task.js";
import type { Dependency } from "../../src/domain/value-objects/dependency.js";
import type { ReviewRecord } from "../../src/domain/value-objects/review-record.js";
import type { StateSnapshot } from "../../src/domain/value-objects/state-snapshot.js";
import type { WorkflowSession } from "../../src/domain/value-objects/workflow-session.js";

describe("mergeStateSnapshots", () => {
	// Test fixtures
	const createBaseSnapshot = (): StateSnapshot => ({
		version: 1,
		exportedAt: "2024-01-01T00:00:00.000Z",
		project: {
			id: "proj-1",
			name: "Test Project",
			vision: "Test Vision",
			createdAt: new Date("2024-01-01"),
		} as Project,
		milestones: [
			{
				id: "M01",
				projectId: "proj-1",
				name: "Milestone 1",
				number: 1,
				status: "open",
				createdAt: new Date("2024-01-01"),
			} as Milestone,
		],
		slices: [
			{
				id: "M01-S01",
				milestoneId: "M01",
				number: 1,
				title: "Slice 1",
				status: "discussing",
				tier: "F-lite",
				createdAt: new Date("2024-01-01"),
			} as Slice,
			{
				id: "M01-S02",
				milestoneId: "M01",
				number: 2,
				title: "Slice 2",
				status: "discussing",
				createdAt: new Date("2024-01-01"),
			} as Slice,
		],
		tasks: [
			{
				id: "M01-S01-T01",
				sliceId: "M01-S01",
				number: 1,
				title: "Task 1",
				status: "open",
				createdAt: new Date("2024-01-01"),
			} as Task,
		],
		dependencies: [],
		workflowSession: {
			phase: "planning",
			activeSliceId: "M01-S01",
		} as WorkflowSession,
		reviews: [],
	});

	describe("basic merge operations", () => {
		it("should replace parent slice with child slice", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					{
						id: "M01-S01",
						milestoneId: "M01",
						number: 1,
						title: "Slice 1 Modified",
						status: "building",
						tier: "F-full",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const mergedSlice = result.data.slices.find((s) => s.id === "M01-S01");
				expect(mergedSlice).toBeDefined();
				expect(mergedSlice?.title).toBe("Slice 1 Modified");
				expect(mergedSlice?.status).toBe("building");
				expect(mergedSlice?.tier).toBe("F-full");
			}
		});

		it("should replace parent tasks with child tasks for the merged slice", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "Task 1 Modified",
						status: "in_progress",
						createdAt: new Date("2024-01-02"),
					} as Task,
					{
						id: "M01-S01-T02",
						sliceId: "M01-S01",
						number: 2,
						title: "New Task 2",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const sliceTasks = result.data.tasks.filter((t) => t.sliceId === "M01-S01");
				expect(sliceTasks.length).toBe(2);
				expect(sliceTasks[0]?.title).toBe("Task 1 Modified");
				expect(sliceTasks[1]?.title).toBe("New Task 2");
			}
		});

		it("should preserve other slices from parent", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					{
						id: "M01-S01",
						milestoneId: "M01",
						number: 1,
						title: "Slice 1 Modified",
						status: "building",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const otherSlice = result.data.slices.find((s) => s.id === "M01-S02");
				expect(otherSlice).toBeDefined();
				expect(otherSlice?.title).toBe("Slice 2");
			}
		});

		it("should preserve other tasks from parent (different slices)", () => {
			const parent = createBaseSnapshot();
			parent.tasks.push({
				id: "M01-S02-T01",
				sliceId: "M01-S02",
				number: 1,
				title: "Task on Slice 2",
				status: "open",
				createdAt: new Date("2024-01-01"),
			} as Task);

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [
					{
						id: "M01-S01-T02",
						sliceId: "M01-S01",
						number: 2,
						title: "New Task on Slice 1",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const otherTask = result.data.tasks.find((t) => t.id === "M01-S02-T01");
				expect(otherTask).toBeDefined();
				expect(otherTask?.title).toBe("Task on Slice 2");
			}
		});
	});

	describe("dependency merge", () => {
		it("should replace dependencies for child tasks", () => {
			const parent = createBaseSnapshot();
			parent.dependencies = [
				{ fromId: "M01-S01-T01", toId: "other-task", type: "blocks" } as Dependency,
			];

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "Task 1",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
					{
						id: "M01-S01-T02",
						sliceId: "M01-S01",
						number: 2,
						title: "Task 2",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
				dependencies: [
					{ fromId: "M01-S01-T01", toId: "new-dep", type: "blocks" } as Dependency,
					{ fromId: "M01-S01-T02", toId: "another-dep", type: "blocks" } as Dependency,
				],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				// Old dependency from parent should be removed
				const oldDep = result.data.dependencies.find(
					(d) => d.fromId === "M01-S01-T01" && d.toId === "other-task",
				);
				expect(oldDep).toBeUndefined();

				// New dependencies from child should be present
				const newDep = result.data.dependencies.find(
					(d) => d.fromId === "M01-S01-T01" && d.toId === "new-dep",
				);
				expect(newDep).toBeDefined();

				const anotherDep = result.data.dependencies.find(
					(d) => d.fromId === "M01-S01-T02" && d.toId === "another-dep",
				);
				expect(anotherDep).toBeDefined();
			}
		});

		it("should preserve dependencies for tasks not in child slice", () => {
			const parent = createBaseSnapshot();
			parent.tasks.push({
				id: "M01-S02-T01",
				sliceId: "M01-S02",
				number: 1,
				title: "Task on Slice 2",
				status: "open",
				createdAt: new Date("2024-01-01"),
			} as Task);
			parent.dependencies = [
				{ fromId: "M01-S02-T01", toId: "some-task", type: "blocks" } as Dependency,
			];

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "Task 1 Modified",
						status: "in_progress",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
				dependencies: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const preservedDep = result.data.dependencies.find((d) => d.fromId === "M01-S02-T01");
				expect(preservedDep).toBeDefined();
				expect(preservedDep?.toId).toBe("some-task");
			}
		});
	});

	describe("metadata preservation", () => {
		it("should preserve project from parent", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				project: null,
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.project).toEqual(parent.project);
			}
		});

		it("should preserve milestones from parent", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				milestones: [],
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.milestones).toEqual(parent.milestones);
			}
		});

		it("should preserve workflowSession from parent", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				workflowSession: null,
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.workflowSession).toEqual(parent.workflowSession);
			}
		});

		it("should preserve reviews from parent", () => {
			const parent = createBaseSnapshot();
			parent.reviews = [
				{
					id: "rev-1",
					sliceId: "M01-S01",
					reviewer: "alice",
					score: 5,
					createdAt: new Date("2024-01-01"),
				} as ReviewRecord,
			];

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				reviews: [],
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.reviews).toEqual(parent.reviews);
			}
		});

		it("should update exportedAt timestamp", () => {
			const parent = createBaseSnapshot();
			const oldTimestamp = parent.exportedAt;

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.exportedAt).not.toBe(oldTimestamp);
				// Should be a valid ISO timestamp (within last minute)
				const exportedDate = new Date(result.data.exportedAt);
				expect(exportedDate.getTime()).toBeGreaterThan(Date.now() - 60000);
			}
		});

		it("should preserve version from parent", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				version: 999,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.version).toBe(parent.version);
			}
		});
	});

	describe("error handling", () => {
		it("should return error when child does not have the specified slice", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [],
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(false);

			if (!result.ok) {
				expect(result.error.code).toBe("SYNC_FAILED");
				expect(result.error.message).toContain("M01-S01");
				expect(result.error.context?.availableSlices).toEqual([]);
			}
		});

		it("should return error with available slices in context when slice not found", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					{
						id: "M01-S03",
						milestoneId: "M01",
						number: 3,
						title: "Different Slice",
						status: "discussing",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(false);

			if (!result.ok) {
				expect(result.error.context?.availableSlices).toEqual(["M01-S03"]);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty parent", () => {
			const parent: StateSnapshot = {
				version: 1,
				exportedAt: "2024-01-01T00:00:00.000Z",
				project: null,
				milestones: [],
				slices: [],
				tasks: [],
				dependencies: [],
				workflowSession: null,
				reviews: [],
			};

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					{
						id: "M01-S01",
						milestoneId: "M01",
						number: 1,
						title: "New Slice",
						status: "discussing",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "New Task",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.data.slices.length).toBe(1);
				expect(result.data.tasks.length).toBe(1);
			}
		});

		it("should handle empty child tasks", () => {
			const parent = createBaseSnapshot();
			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					{
						id: "M01-S01",
						milestoneId: "M01",
						number: 1,
						title: "Slice with no tasks",
						status: "completed",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const sliceTasks = result.data.tasks.filter((t) => t.sliceId === "M01-S01");
				expect(sliceTasks.length).toBe(0);
			}
		});

		it("should handle child with no dependencies", () => {
			const parent = createBaseSnapshot();
			parent.dependencies = [
				{ fromId: "M01-S01-T01", toId: "old-dep", type: "blocks" } as Dependency,
			];

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: parent.slices,
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "Task 1",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
				dependencies: [],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				// All dependencies for M01-S01-T01 should be removed
				const remainingDeps = result.data.dependencies.filter((d) => d.fromId === "M01-S01-T01");
				expect(remainingDeps.length).toBe(0);
			}
		});

		it("should handle merging when parent has no matching slice", () => {
			const parent = createBaseSnapshot();
			parent.slices = parent.slices.filter((s) => s.id !== "M01-S01");
			parent.tasks = parent.tasks.filter((t) => t.sliceId !== "M01-S01");

			const child: StateSnapshot = {
				...parent,
				exportedAt: "2024-01-02T00:00:00.000Z",
				slices: [
					...parent.slices,
					{
						id: "M01-S01",
						milestoneId: "M01",
						number: 1,
						title: "New Slice from Child",
						status: "discussing",
						createdAt: new Date("2024-01-02"),
					} as Slice,
				],
				tasks: [
					{
						id: "M01-S01-T01",
						sliceId: "M01-S01",
						number: 1,
						title: "New Task from Child",
						status: "open",
						createdAt: new Date("2024-01-02"),
					} as Task,
				],
			};

			const result = mergeStateSnapshots(parent, child, "M01-S01");
			expect(result.ok).toBe(true);

			if (result.ok) {
				const mergedSlice = result.data.slices.find((s) => s.id === "M01-S01");
				expect(mergedSlice?.title).toBe("New Slice from Child");
				const mergedTask = result.data.tasks.find((t) => t.id === "M01-S01-T01");
				expect(mergedTask?.title).toBe("New Task from Child");
			}
		});
	});
});
