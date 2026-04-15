import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sliceTransitionCmd } from "../../src/cli/commands/slice-transition.cmd.js";
import type { Slice } from "../../src/domain/entities/slice.js";

// Define mock stores using vi.hoisted() so they're available when vi.mock() runs
const { mockSliceStore, mockMilestoneStore, mockTaskStore, mockProjectStore } = vi.hoisted(() => ({
	mockSliceStore: {} as any,
	mockMilestoneStore: {} as any,
	mockTaskStore: {} as any,
	mockProjectStore: {} as any,
}));

// Mock with-branch-guard - will pass through to inner function
const mockWithBranchGuard = vi.fn(async <T>(fn: (stores: any) => Promise<T>) =>
	fn({ sliceStore: mockSliceStore, milestoneStore: mockMilestoneStore, taskStore: mockTaskStore }),
);
vi.mock("../../src/cli/with-branch-guard.js", () => ({
	withBranchGuard: (...args: any[]) => mockWithBranchGuard(...args),
}));

// Mock the transition-slice use case to control behavior
const mockTransitionSliceUseCase = vi.fn();
vi.mock("../../src/application/lifecycle/transition-slice.js", () => ({
	transitionSliceUseCase: (...args: any[]) => mockTransitionSliceUseCase(...args),
	isOk: (result: any) => result.ok === true,
}));

// Mock isOk from domain/result
vi.mock("../../src/domain/result.js", () => ({
	isOk: (result: any) => result.ok === true,
}));

// Mock state generation (non-critical path)
vi.mock("../../src/application/sync/generate-state.js", () => ({
	generateState: vi.fn().mockResolvedValue(undefined),
}));

// Mock sync branch use case
vi.mock("../../src/application/state-branch/sync-branch.js", () => ({
	syncBranchUseCase: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

// Mock logging
vi.mock("../../src/infrastructure/adapters/logging/warn.js", () => ({
	tffWarn: vi.fn(),
}));

// Mock git adapters
vi.mock("../../src/infrastructure/adapters/git/git-cli.adapter.js", () => ({
	GitCliAdapter: vi.fn().mockImplementation(() => ({
		getCurrentBranch: vi.fn().mockResolvedValue({ ok: true, data: "main" }),
	})),
}));

vi.mock("../../src/infrastructure/adapters/git/git-state-branch.adapter.js", () => ({
	GitStateBranchAdapter: vi.fn().mockImplementation(() => ({
		exists: vi.fn().mockResolvedValue({ ok: true, data: false }),
	})),
}));

// Mock branch-meta-stamp
vi.mock("../../src/infrastructure/hooks/branch-meta-stamp.js", () => ({
	readLocalStamp: vi.fn().mockReturnValue({
		codeBranch: "main",
		stateId: "test-state-id",
		parentStateBranch: null,
		createdAt: new Date().toISOString(),
	}),
	writeSyntheticStamp: vi.fn(),
}));

// Mock checkpoint-save
vi.mock("../../src/cli/commands/checkpoint-save.cmd.js", () => ({
	checkpointSaveCmd: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock sync-state command
vi.mock("../../src/cli/commands/sync-state.cmd.js", () => ({
	syncStateCmd: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock session:remind command
vi.mock("../../src/cli/commands/session-remind.cmd.js", () => ({
	sessionRemindCmd: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

// Mock milestone-create command
vi.mock("../../src/cli/commands/milestone-create.cmd.js", () => ({
	milestoneCreateCmd: vi.fn().mockResolvedValue({ ok: true, data: { id: "m01", number: 1 } }),
}));

// Mock slice-create command
vi.mock("../../src/cli/commands/slice-create.cmd.js", () => ({
	sliceCreateCmd: vi.fn().mockResolvedValue({ ok: true, data: { id: "s01", number: 1 } }),
}));

// Mock task-claim command
vi.mock("../../src/cli/commands/task-claim.cmd.js", () => ({
	taskClaimCmd: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock task-close command
vi.mock("../../src/cli/commands/task-close.cmd.js", () => ({
	taskCloseCmd: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock project-init command
vi.mock("../../src/cli/commands/project-init.cmd.js", () => ({
	projectInitCmd: vi.fn().mockResolvedValue({ ok: true, data: { id: "test-project" } }),
}));

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createStateStores: vi.fn().mockReturnValue({
		sliceStore: mockSliceStore,
		milestoneStore: mockMilestoneStore,
		taskStore: mockTaskStore,
		projectStore: mockProjectStore,
	}),
	createStateStoresUnchecked: vi.fn().mockReturnValue({
		sliceStore: mockSliceStore,
		milestoneStore: mockMilestoneStore,
		taskStore: mockTaskStore,
		projectStore: mockProjectStore,
	}),
}));

let capturedSlice: Slice | null = null;

beforeEach(() => {
	capturedSlice = null;
	mockSliceStore.getById = vi.fn().mockResolvedValue(capturedSlice);
	mockSliceStore.update = vi.fn().mockResolvedValue(undefined);
	mockSliceStore.getAllByMilestoneId = vi.fn().mockResolvedValue([]);
	mockMilestoneStore.getById = vi.fn().mockResolvedValue({ id: "m01", number: 1, status: "open" });
	mockTaskStore.getBySliceId = vi.fn().mockResolvedValue([]);
	mockProjectStore.get = vi.fn().mockResolvedValue({ id: "test-project", name: "Test Project" });
	mockTransitionSliceUseCase.mockReset();
	mockTransitionSliceUseCase.mockImplementation(async (slice: Slice) => {
		capturedSlice = slice;
		return { ok: true, data: slice };
	});
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
		mockSliceStore.getById = vi.fn().mockResolvedValue(mockSlice);
		mockTransitionSliceUseCase.mockResolvedValue({
			ok: true,
			data: { slice: mockSlice },
		});

		const result = JSON.parse(await sliceTransitionCmd(["M01-S01", "researching"]));

		expect(mockTransitionSliceUseCase).toHaveBeenCalled();
		expect(result.ok).toBe(true);
	});

	it("handles invalid transition", async () => {
		mockSliceStore.getById = vi.fn().mockResolvedValue({
			id: "M01-S01",
			milestoneId: "m01",
			number: 1,
			status: "discussing",
			title: "Test Slice",
			createdAt: new Date(),
		});

		mockTransitionSliceUseCase.mockResolvedValue({
			ok: false,
			error: { code: "INVALID_TRANSITION", message: "Cannot transition" },
		});

		const result = JSON.parse(await sliceTransitionCmd(["M01-S01", "closed"]));

		expect(result.ok).toBe(false);
	});
});
