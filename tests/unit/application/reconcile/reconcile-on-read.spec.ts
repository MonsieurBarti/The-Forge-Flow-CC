import { describe, expect, it, vi } from "vitest";
import { reconcileOnRead } from "../../../../src/application/reconcile/reconcile-on-read.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import type { SliceStore } from "../../../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../../../src/domain/ports/task-store.port.js";
import { Err, Ok } from "../../../../src/domain/result.js";

function makeMilestoneStore(
	listResult: ReturnType<MilestoneStore["listMilestones"]>,
): MilestoneStore {
	return {
		listMilestones: vi.fn().mockReturnValue(listResult),
		getMilestone: vi.fn(),
		getMilestoneByNumber: vi.fn(),
		createMilestone: vi.fn(),
		updateMilestone: vi.fn(),
		closeMilestone: vi.fn(),
	} as unknown as MilestoneStore;
}

describe("reconcileOnRead", () => {
	it("returns silently when listMilestones returns an error (line 28 branch)", async () => {
		const milestoneStore = makeMilestoneStore(
			Err({ code: "WRITE_FAILURE", message: "db error" } as never),
		);
		const sliceStore = {} as SliceStore;
		const taskStore = {} as TaskStore;

		// Must not throw
		await expect(
			reconcileOnRead("/tmp/test-cwd", { milestoneStore, sliceStore, taskStore }),
		).resolves.toBeUndefined();
	});

	it("returns silently when no active milestone exists (line 30 branch)", async () => {
		const milestoneStore = makeMilestoneStore(Ok([]));
		const sliceStore = {} as SliceStore;
		const taskStore = {} as TaskStore;

		await expect(
			reconcileOnRead("/tmp/test-cwd", { milestoneStore, sliceStore, taskStore }),
		).resolves.toBeUndefined();
	});

	it("swallows error when renderStateMd returns Err (line 36 branch)", async () => {
		// Provide an active milestone so reconcileState is called
		const milestoneStore = makeMilestoneStore(
			Ok([{ id: "m01", status: "executing", number: 1, name: "MVP" } as never]),
		);
		// Provide a getMilestone that returns Err so renderStateMd returns Err
		milestoneStore.getMilestone = vi
			.fn()
			.mockReturnValue(Err({ code: "WRITE_FAILURE", message: "db fail" } as never));
		const sliceStore = {
			listSlices: vi.fn().mockReturnValue(Ok([])),
		} as unknown as SliceStore;
		const taskStore = {
			listTasks: vi.fn().mockReturnValue(Ok([])),
		} as unknown as TaskStore;

		// Must not throw — error is swallowed
		await expect(
			reconcileOnRead("/tmp/test-cwd-no-file", { milestoneStore, sliceStore, taskStore }),
		).resolves.toBeUndefined();
	});
});
