import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sliceTransitionCmd } from "../../src/cli/commands/slice-transition.cmd.js";
import type { Slice } from "../../src/domain/entities/slice.js";
import type { MilestoneStore } from "../../src/domain/ports/milestone-store.port.js";
import type { ProjectStore } from "../../src/domain/ports/project-store.port.js";
import type { SliceStore } from "../../src/domain/ports/slice-store.port.js";
import type { TaskStore } from "../../src/domain/ports/task-store.port.js";
import type { StateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

// All mock variables must be defined in vi.hoisted to be available during vi.mock hoisting
const {
	mockSliceStore,
	mockMilestoneStore,
	mockTaskStore,
	mockProjectStore,
	mockWithBranchGuard,
	mockTransitionSliceUseCase,
} = vi.hoisted(() => {
	const mockSliceStore: Partial<SliceStore> = {
		getById: vi.fn(),
		update: vi.fn(),
		getAllByMilestoneId: vi.fn(),
	};
	const mockMilestoneStore: Partial<MilestoneStore> = {
		getById: vi.fn(),
	};
	const mockTaskStore: Partial<TaskStore> = {
		getBySliceId: vi.fn(),
	};
	const mockProjectStore: Partial<ProjectStore> = {
		get: vi.fn(),
	};

	const mockWithBranchGuard = vi.fn(async <T>(fn: (stores: StateStores) => Promise<T>) =>
		fn({
			sliceStore: mockSliceStore as SliceStore,
			milestoneStore: mockMilestoneStore as MilestoneStore,
			taskStore: mockTaskStore as TaskStore,
			projectStore: mockProjectStore as ProjectStore,
		} as StateStores),
	);

	const mockTransitionSliceUseCase = vi.fn();

	return {
		mockSliceStore,
		mockMilestoneStore,
		mockTaskStore,
		mockProjectStore,
		mockWithBranchGuard,
		mockTransitionSliceUseCase,
	};
});

vi.mock("../../src/cli/with-branch-guard.js", () => ({
	withBranchGuard: mockWithBranchGuard,
}));

vi.mock("../../src/application/lifecycle/transition-slice.js", () => ({
	transitionSliceUseCase: mockTransitionSliceUseCase,
	isOk: (result: { ok: boolean }) => result.ok === true,
}));

// Mock isOk from domain/result
vi.mock("../../src/domain/result.js", () => ({
	isOk: (result: { ok: boolean }) => result.ok === true,
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
	Object.assign(mockSliceStore, {
		getById: vi.fn().mockResolvedValue(capturedSlice),
		update: vi.fn().mockResolvedValue(undefined),
		getAllByMilestoneId: vi.fn().mockResolvedValue([]),
	});
	Object.assign(mockMilestoneStore, {
		getById: vi.fn().mockResolvedValue({ id: "m01", number: 1, status: "open" }),
	});
	Object.assign(mockTaskStore, {
		getBySliceId: vi.fn().mockResolvedValue([]),
	});
	Object.assign(mockProjectStore, {
		get: vi.fn().mockResolvedValue({ id: "test-project", name: "Test Project" }),
	});
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
		Object.assign(mockSliceStore, {
			getById: vi.fn().mockResolvedValue(mockSlice),
		});
		mockTransitionSliceUseCase.mockResolvedValue({
			ok: true,
			data: { slice: mockSlice },
		});

		const result = JSON.parse(await sliceTransitionCmd(["M01-S01", "researching"]));

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

		const result = JSON.parse(await sliceTransitionCmd(["M01-S01", "closed"]));

		expect(result.ok).toBe(false);
	});
});
