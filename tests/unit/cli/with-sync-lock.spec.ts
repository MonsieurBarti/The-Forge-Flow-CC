import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("withSyncLock", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns fn result when lock acquisition succeeds", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(mockRelease),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn().mockReturnValue({ projectStore: "mock" }),
			createClosableStateStores: vi.fn(),
		}));

		const { withSyncLock } = await import("./with-sync-lock.js");
		const result = await withSyncLock(async (stores) => {
			expect(stores.projectStore).toBe("mock");
			return "success";
		});
		expect(result).toBe("success");
		expect(mockRelease).toHaveBeenCalled();
	});

	it("returns skip response when lock acquisition fails", async () => {
		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(null),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn(),
			createClosableStateStores: vi.fn(),
		}));

		const { withSyncLock } = await import("./with-sync-lock.js");
		const result = await withSyncLock(async () => "should-not-run");

		expect(result).toEqual({
			ok: true,
			data: {
				action: "skipped",
				reason: "Lock held by another process",
			},
		});
	});

	it("releases lock even when fn throws", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(mockRelease),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn().mockReturnValue({ projectStore: "mock" }),
			createClosableStateStores: vi.fn(),
		}));

		const { withSyncLock } = await import("./with-sync-lock.js");
		await expect(
			withSyncLock(async () => {
				throw new Error("fn failure");
			}),
		).rejects.toThrow("fn failure");

		expect(mockRelease).toHaveBeenCalled();
	});

	it("uses custom dbPath when provided", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		const mockAcquireSyncLock = vi.fn().mockResolvedValue(mockRelease);
		const mockCreateStateStores = vi.fn().mockReturnValue({ projectStore: "mock" });

		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: mockAcquireSyncLock,
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: mockCreateStateStores,
			createClosableStateStores: vi.fn(),
		}));

		const { withSyncLock } = await import("./with-sync-lock.js");
		await withSyncLock(async () => "success", { dbPath: "/custom/path/state.db" });

		expect(mockAcquireSyncLock).toHaveBeenCalledWith("/custom/path/state.db", 5000);
		expect(mockCreateStateStores).toHaveBeenCalledWith("/custom/path/state.db");
	});
});

describe("withClosableSyncLock", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns fn result when lock acquisition succeeds", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		const mockClose = vi.fn();
		const mockCheckpoint = vi.fn();

		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(mockRelease),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn(),
			createClosableStateStores: vi.fn().mockReturnValue({
				projectStore: "mock-closable",
				close: mockClose,
				checkpoint: mockCheckpoint,
			}),
		}));

		const { withClosableSyncLock } = await import("./with-sync-lock.js");
		const result = await withClosableSyncLock(async (stores) => {
			expect(stores.projectStore).toBe("mock-closable");
			expect(stores.close).toBe(mockClose);
			expect(stores.checkpoint).toBe(mockCheckpoint);
			return "closable-success";
		});
		expect(result).toBe("closable-success");
		expect(mockRelease).toHaveBeenCalled();
	});

	it("returns skip response when lock acquisition fails", async () => {
		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(null),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn(),
			createClosableStateStores: vi.fn(),
		}));

		const { withClosableSyncLock } = await import("./with-sync-lock.js");
		const result = await withClosableSyncLock(async () => "should-not-run");

		expect(result).toEqual({
			ok: true,
			data: {
				action: "skipped",
				reason: "Lock held by another process",
			},
		});
	});

	it("releases lock even when fn throws", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: vi.fn().mockResolvedValue(mockRelease),
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn(),
			createClosableStateStores: vi.fn().mockReturnValue({
				projectStore: "mock",
				close: vi.fn(),
				checkpoint: vi.fn(),
			}),
		}));

		const { withClosableSyncLock } = await import("./with-sync-lock.js");
		await expect(
			withClosableSyncLock(async () => {
				throw new Error("fn failure");
			}),
		).rejects.toThrow("fn failure");

		expect(mockRelease).toHaveBeenCalled();
	});

	it("uses custom dbPath when provided", async () => {
		const mockRelease = vi.fn().mockResolvedValue(undefined);
		const mockAcquireSyncLock = vi.fn().mockResolvedValue(mockRelease);
		const mockCreateClosableStateStores = vi.fn().mockReturnValue({
			projectStore: "mock",
			close: vi.fn(),
			checkpoint: vi.fn(),
		});

		vi.doMock("../infrastructure/locking/tff-lock.js", () => ({
			acquireSyncLock: mockAcquireSyncLock,
		}));
		vi.doMock("../infrastructure/adapters/sqlite/create-state-stores.js", () => ({
			createStateStores: vi.fn(),
			createClosableStateStores: mockCreateClosableStateStores,
		}));

		const { withClosableSyncLock } = await import("./with-sync-lock.js");
		await withClosableSyncLock(async () => "success", { dbPath: "/custom/path/state.db" });

		expect(mockAcquireSyncLock).toHaveBeenCalledWith("/custom/path/state.db", 5000);
		expect(mockCreateClosableStateStores).toHaveBeenCalledWith("/custom/path/state.db");
	});
});
