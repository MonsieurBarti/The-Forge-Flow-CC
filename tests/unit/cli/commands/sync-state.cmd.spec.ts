import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncStateCmd, syncStateSchema } from "../../../../src/cli/commands/sync-state.cmd.js";
import { parseFlags } from "../../../../src/cli/utils/flag-parser.js";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

vi.mock("../../../../src/cli/with-sync-lock.js");
vi.mock("../../../../src/application/sync/generate-state.js");

import { generateState } from "../../../../src/application/sync/generate-state.js";
import { withClosableSyncLock } from "../../../../src/cli/with-sync-lock.js";

describe("syncStateSchema — flag parsing", () => {
	it("accepts a display label (M01)", () => {
		const result = parseFlags(["--milestone-id", "M01"], syncStateSchema);
		expect(result.ok).toBe(true);
	});

	it("accepts a UUID (lowercase)", () => {
		const result = parseFlags(
			["--milestone-id", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
			syncStateSchema,
		);
		expect(result.ok).toBe(true);
	});

	it("accepts a UUID (case-insensitive)", () => {
		const result = parseFlags(
			["--milestone-id", "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"],
			syncStateSchema,
		);
		expect(result.ok).toBe(true);
	});

	it("rejects garbage input", () => {
		const result = parseFlags(["--milestone-id", "not-valid!!"], syncStateSchema);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("PATTERN_MISMATCH");
	});
});

describe("syncStateCmd — behavior", () => {
	function makeMockStores(
		overrides: Partial<ClosableStateStores["milestoneStore"]> = {},
	): ClosableStateStores {
		return {
			milestoneStore: {
				createMilestone: vi.fn(),
				getMilestone: vi.fn(),
				getMilestoneByNumber: vi.fn().mockReturnValue({ ok: true, data: null }),
				listMilestones: vi.fn(),
				updateMilestone: vi.fn(),
				closeMilestone: vi.fn(),
				...overrides,
			} as ClosableStateStores["milestoneStore"],
			sliceStore: {
				createSlice: vi.fn(),
				getSlice: vi.fn(),
				listSlices: vi.fn(),
				updateSlice: vi.fn(),
				transitionSlice: vi.fn(),
				getSliceByNumbers: vi.fn(),
			} as ClosableStateStores["sliceStore"],
			taskStore: {
				createTask: vi.fn(),
				getTask: vi.fn(),
				listTasks: vi.fn(),
				updateTask: vi.fn(),
				claimTask: vi.fn(),
				closeTask: vi.fn(),
				listReadyTasks: vi.fn(),
				listStaleClaims: vi.fn(),
				getExecutorsForSlice: vi.fn(),
			} as ClosableStateStores["taskStore"],
			projectStore: { getProject: vi.fn(), saveProject: vi.fn() },
			dependencyStore: {
				addDependency: vi.fn(),
				removeDependency: vi.fn(),
				getDependencies: vi.fn(),
			},
			sessionStore: { getSession: vi.fn(), saveSession: vi.fn() },
			reviewStore: {
				recordReview: vi.fn(),
				getLatestReview: vi.fn(),
				listReviews: vi.fn(),
			},
			milestoneAuditStore: { upsertAudit: vi.fn(), getAudit: vi.fn() },
			sliceDependencyStore: {
				addSliceDependency: vi.fn(),
				removeSliceDependency: vi.fn(),
				getSliceDependencies: vi.fn(),
			},
			journalRepository: {
				append: vi.fn(),
				readAll: vi.fn(),
				readSince: vi.fn(),
				count: vi.fn(),
			},
			db: { init: vi.fn() },
			close: vi.fn(),
			checkpoint: vi.fn(),
		} as unknown as ClosableStateStores;
	}

	beforeEach(() => {
		vi.resetAllMocks();

		// Default: withClosableSyncLock executes the callback with mock stores
		vi.mocked(withClosableSyncLock).mockImplementation(async (fn) => {
			const stores = makeMockStores();
			return fn(stores);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns NOT_FOUND error when milestone label does not resolve", async () => {
		vi.mocked(withClosableSyncLock).mockImplementation(async (fn) => {
			const stores = makeMockStores({
				getMilestoneByNumber: vi.fn().mockReturnValue({ ok: true, data: null }),
			});
			return fn(stores);
		});

		const result = JSON.parse(await syncStateCmd(["--milestone-id", "M99"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("returns error JSON when required --milestone-id flag is missing", async () => {
		const result = JSON.parse(await syncStateCmd([]));
		expect(result.ok).toBe(false);
	});

	it("returns error JSON when generateState fails", async () => {
		const milestoneId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

		vi.mocked(withClosableSyncLock).mockImplementation(async (fn) => {
			const stores = makeMockStores({
				getMilestoneByNumber: vi.fn().mockReturnValue({ ok: true, data: { id: milestoneId } }),
			});
			return fn(stores);
		});

		vi.mocked(generateState).mockResolvedValue({
			ok: false,
			error: { code: "WRITE_FAILURE", message: "fail" },
		} as never);

		const result = JSON.parse(await syncStateCmd(["--milestone-id", "M01"]));
		expect(result.ok).toBe(false);
	});

	it("calls generateState and returns ok when milestone resolves", async () => {
		const milestoneId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

		vi.mocked(withClosableSyncLock).mockImplementation(async (fn) => {
			const stores = makeMockStores({
				getMilestoneByNumber: vi.fn().mockReturnValue({ ok: true, data: { id: milestoneId } }),
			});
			return fn(stores);
		});

		vi.mocked(generateState).mockResolvedValue({ ok: true, data: undefined } as never);

		const result = JSON.parse(await syncStateCmd(["--milestone-id", "M01"]));

		expect(result.ok).toBe(true);
		expect(vi.mocked(generateState)).toHaveBeenCalledWith(
			{ milestoneId },
			expect.objectContaining({ milestoneStore: expect.anything() }),
		);
	});
});
