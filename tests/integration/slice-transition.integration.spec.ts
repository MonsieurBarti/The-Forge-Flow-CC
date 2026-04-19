import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sliceTransitionCmd } from "../../src/cli/commands/slice-transition.cmd.js";
import type { DatabaseInit } from "../../src/domain/ports/database-init.port.js";
import type { MilestoneStore } from "../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../src/domain/ports/task-store.port.js";
import type { TransactionRunner } from "../../src/domain/ports/transaction-runner.port.js";

// All mock variables must be defined in vi.hoisted to be available during vi.mock hoisting
const {
	mockSliceStore,
	mockMilestoneStore,
	mockTaskStore,
	mockProjectStore,
	mockDb,
	mockClosableStateStores,
} = vi.hoisted(() => {
	const mockSliceStore: Partial<SliceStore> = {
		getSlice: vi.fn(),
		listSlices: vi.fn(),
		transitionSlice: vi.fn(),
		getSliceByNumbers: vi.fn(),
	};
	const mockMilestoneStore: Partial<MilestoneStore> = {
		getMilestone: vi.fn(),
	};
	const mockTaskStore: Partial<TaskStore> = {
		listTasks: vi.fn(),
		listReadyTasks: vi.fn(),
	};
	const mockProjectStore: Partial<ProjectStore> = {
		getProject: vi.fn(),
	};

	const mockDb: Partial<DatabaseInit> & TransactionRunner = {
		transaction: vi.fn(),
	};

	const mockClosableStateStores = {
		db: mockDb as DatabaseInit & TransactionRunner,
		sliceStore: mockSliceStore as SliceStore,
		milestoneStore: mockMilestoneStore as MilestoneStore,
		taskStore: mockTaskStore as TaskStore,
		projectStore: mockProjectStore as ProjectStore,
		close: vi.fn(),
		checkpoint: vi.fn(),
	};

	return {
		mockSliceStore,
		mockMilestoneStore,
		mockTaskStore,
		mockProjectStore,
		mockDb,
		mockClosableStateStores,
	};
});

// Mock logging
vi.mock("../../src/infrastructure/adapters/logging/warn.js", () => ({
	tffWarn: vi.fn(),
}));

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn().mockReturnValue(mockClosableStateStores),
}));

beforeEach(() => {
	// Default slice fixture.
	const mockSlice = {
		id: "test-slice-uuid",
		milestoneId: "m01",
		number: 1,
		status: "discussing" as const,
		title: "Test Slice",
		createdAt: new Date(),
	};
	Object.assign(mockSliceStore, {
		getSlice: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
		listSlices: vi.fn().mockReturnValue({ ok: true, data: [mockSlice] }),
		transitionSlice: vi
			.fn()
			.mockImplementation((_id: string, _status: string) => ({ ok: true, data: [] })),
		getSliceByNumbers: vi.fn().mockReturnValue({ ok: true, data: mockSlice }),
	});
	Object.assign(mockMilestoneStore, {
		getMilestone: vi
			.fn()
			.mockReturnValue({ ok: true, data: { id: "m01", number: 1, status: "open", name: "M" } }),
	});
	Object.assign(mockTaskStore, {
		listTasks: vi.fn().mockReturnValue({ ok: true, data: [] }),
		listReadyTasks: vi.fn().mockReturnValue({ ok: true, data: [] }),
	});
	Object.assign(mockProjectStore, {
		getProject: vi.fn().mockReturnValue({ ok: true, data: { id: "singleton", name: "P" } }),
	});
	Object.assign(mockDb, {
		transaction: vi.fn().mockImplementation((fn: () => unknown) => fn()),
	});
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("slice-transition integration", () => {
	it("transitions a slice from discussing to researching", async () => {
		const result = JSON.parse(
			await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]),
		);

		expect(mockSliceStore.transitionSlice).toHaveBeenCalled();
		expect(result.ok).toBe(true);
	});

	it("handles invalid transition", async () => {
		// discussing -> closed is not a valid domain transition.
		const result = JSON.parse(
			await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "closed"]),
		);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_TRANSITION");
	});

	it("includes validPredecessors in INVALID_TRANSITION error when jumping to reviewing from executing", async () => {
		// Seed slice at executing status.
		const executingSlice = {
			id: "test-slice-uuid",
			milestoneId: "m01",
			number: 1,
			status: "executing" as const,
			title: "Test Slice",
			createdAt: new Date(),
		};
		Object.assign(mockSliceStore, {
			getSlice: vi.fn().mockReturnValue({ ok: true, data: executingSlice }),
			listSlices: vi.fn().mockReturnValue({ ok: true, data: [executingSlice] }),
			transitionSlice: vi.fn().mockImplementation(() => ({ ok: true, data: [] })),
			getSliceByNumbers: vi.fn().mockReturnValue({ ok: true, data: executingSlice }),
		});

		// executing -> reviewing is invalid (must go executing -> verifying -> reviewing).
		const result = JSON.parse(
			await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "reviewing"]),
		);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_TRANSITION");
		expect(result.error.validPredecessors).toEqual(["verifying"]);
		expect(result.error.recoveryHint).toContain("verifying");
	});
});
