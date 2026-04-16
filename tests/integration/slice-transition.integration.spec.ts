import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sliceTransitionCmd } from "../../src/cli/commands/slice-transition.cmd.js";
import type { Slice } from "../../src/domain/entities/slice.js";
import type { MilestoneStore } from "../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../src/domain/ports/task-store.port.js";

// All mock variables must be defined in vi.hoisted to be available during vi.mock hoisting
const {
	mockSliceStore,
	mockMilestoneStore,
	mockTaskStore,
	mockProjectStore,
	mockTransitionSliceUseCase,
	mockClosableStateStores,
} = vi.hoisted(() => {
	const mockSliceStore: Partial<SliceStore> = {
		getById: vi.fn(),
		update: vi.fn(),
		getAllByMilestoneId: vi.fn(),
		transitionSlice: vi.fn(),
	};
	const mockMilestoneStore: Partial<MilestoneStore> = {
		getById: vi.fn(),
	};
	const mockTaskStore: Partial<TaskStore> = {
		getBySliceId: vi.fn(),
		listReadyTasks: vi.fn(),
	};
	const mockProjectStore: Partial<ProjectStore> = {
		get: vi.fn(),
	};

	const mockClosableStateStores = {
		sliceStore: mockSliceStore as SliceStore,
		milestoneStore: mockMilestoneStore as MilestoneStore,
		taskStore: mockTaskStore as TaskStore,
		projectStore: mockProjectStore as ProjectStore,
		close: vi.fn(),
		checkpoint: vi.fn(),
	};

	const mockTransitionSliceUseCase = vi.fn();

	return {
		mockSliceStore,
		mockMilestoneStore,
		mockTaskStore,
		mockProjectStore,
		mockTransitionSliceUseCase,
		mockClosableStateStores,
	};
});

vi.mock("../../src/application/lifecycle/transition-slice.js", () => ({
	transitionSliceUseCase: mockTransitionSliceUseCase,
}));

// Mock isOk from domain/result
vi.mock("../../src/domain/result.js", () => ({
	isOk: (result: { ok: boolean }) => result.ok === true,
}));

// Mock state generation (non-critical path)
vi.mock("../../src/application/sync/generate-state.js", () => ({
	generateState: vi.fn().mockResolvedValue(undefined),
}));

// Mock logging
vi.mock("../../src/infrastructure/adapters/logging/warn.js", () => ({
	tffWarn: vi.fn(),
}));

// Mock checkpoint-save
vi.mock("../../src/cli/commands/checkpoint-save.cmd.js", () => ({
	checkpointSaveCmd: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn().mockReturnValue(mockClosableStateStores),
}));

let capturedSlice: Slice | null = null;

beforeEach(() => {
	capturedSlice = null;
	Object.assign(mockSliceStore, {
		getById: vi.fn().mockResolvedValue(capturedSlice),
		update: vi.fn().mockResolvedValue(undefined),
		getAllByMilestoneId: vi.fn().mockResolvedValue([]),
		transitionSlice: vi.fn().mockImplementation((id: string, status: string) => ({
			ok: true,
			data: { id, status },
		})),
	});
	Object.assign(mockMilestoneStore, {
		getById: vi.fn().mockResolvedValue({ id: "m01", number: 1, status: "open" }),
	});
	Object.assign(mockTaskStore, {
		getBySliceId: vi.fn().mockResolvedValue([]),
		listReadyTasks: vi.fn().mockResolvedValue([]),
	});
	Object.assign(mockProjectStore, {
		get: vi.fn().mockResolvedValue({ id: "test-project", name: "Test Project" }),
	});
	mockTransitionSliceUseCase.mockReset();
	mockTransitionSliceUseCase.mockImplementation(
		async (input: { sliceId: string; targetStatus: string }) => {
			return { ok: true, data: { slice: { id: input.sliceId, status: input.targetStatus } } };
		},
	);
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("slice-transition integration", () => {
	it("transitions a slice from discussing to researching", async () => {
		const mockSlice = {
			id: "M01-S01",
			milestoneId: "m01",
			number: 1,
			status: "researching",
			title: "Test Slice",
			createdAt: new Date(),
		};
		Object.assign(mockSliceStore, {
			getById: vi.fn().mockResolvedValue(mockSlice),
		});
		mockTransitionSliceUseCase.mockResolvedValue({
			ok: true,
			data: { slice: mockSlice },
		});

		const result = JSON.parse(await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]));

		expect(mockTransitionSliceUseCase).toHaveBeenCalled();
		expect(result.ok).toBe(true);
	});

	it("handles invalid transition", async () => {
		Object.assign(mockSliceStore, {
			getById: vi.fn().mockResolvedValue({
				id: "M01-S01",
				milestoneId: "m01",
				number: 1,
				status: "discussing",
				title: "Test Slice",
				createdAt: new Date(),
			}),
		});

		mockTransitionSliceUseCase.mockResolvedValue({
			ok: false,
			error: { code: "INVALID_TRANSITION", message: "Cannot transition" },
		});

		const result = JSON.parse(await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "closed"]));

		expect(result.ok).toBe(false);
	});
});
