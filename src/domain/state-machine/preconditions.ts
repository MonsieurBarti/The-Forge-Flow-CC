import type { PreconditionViolation } from "../errors/precondition-violation.error.js";
import type { MilestoneStore } from "../ports/milestone-store.port.js";
import type { SliceStore } from "../ports/slice-store.port.js";
import type { TaskStore } from "../ports/task-store.port.js";
import type { SliceStatus } from "../value-objects/slice-status.js";

export type PreconditionResult = { ok: true } | { ok: false; violations: PreconditionViolation[] };

export const checkSliceStatus = (
	store: SliceStore,
	sliceId: string,
	expected: SliceStatus,
): PreconditionResult => {
	const result = store.getSlice(sliceId);
	if (!result.ok || result.data === null) {
		return {
			ok: false,
			violations: [{ code: "SLICE_NOT_FOUND", expected: sliceId, actual: null }],
		};
	}
	const slice = result.data;
	if (slice.status !== expected) {
		return {
			ok: false,
			violations: [
				{
					code: "SLICE_STATUS_MISMATCH",
					expected,
					actual: slice.status,
				},
			],
		};
	}
	return { ok: true };
};

export const checkTasksClosed = (store: TaskStore, sliceId: string): PreconditionResult => {
	const result = store.listTasks(sliceId);
	if (!result.ok) {
		return {
			ok: false,
			violations: [
				{
					code: "TASK_LOOKUP_FAILED",
					expected: "ok",
					actual: result.error.code,
				},
			],
		};
	}
	const openCount = result.data.filter((t) => t.status !== "closed").length;
	if (openCount > 0) {
		return {
			ok: false,
			violations: [{ code: "TASKS_NOT_CLOSED", expected: 0, actual: openCount }],
		};
	}
	return { ok: true };
};

export const checkMilestoneActive = (
	store: MilestoneStore,
	milestoneId: string,
): PreconditionResult => {
	const result = store.getMilestone(milestoneId);
	if (!result.ok || result.data === null) {
		return {
			ok: false,
			violations: [{ code: "MILESTONE_NOT_FOUND", expected: milestoneId, actual: null }],
		};
	}
	const milestone = result.data;
	// "active" means not closed — MilestoneStatus has no dedicated "active" value.
	if (milestone.status === "closed") {
		return {
			ok: false,
			violations: [
				{
					code: "MILESTONE_NOT_ACTIVE",
					expected: "active",
					actual: milestone.status,
				},
			],
		};
	}
	return { ok: true };
};
