import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const { mockClosableStateStores } = vi.hoisted(() => {
	return {
		mockClosableStateStores: {} as {
			db: unknown;
			sliceStore: unknown;
			milestoneStore: unknown;
			taskStore: unknown;
			projectStore: unknown;
			close: () => void;
			checkpoint: () => void;
		},
	};
});

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

vi.mock("../../src/infrastructure/adapters/logging/warn.js", () => ({
	tffWarn: vi.fn(),
}));

let repo: string;
let prevCwd: string;

async function setupAdapter(): Promise<{ adapter: SQLiteStateAdapter; sliceId: string }> {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	const ms = adapter.createMilestone({ number: 1, name: "M" });
	if (!ms.ok) throw new Error("milestone create failed");
	const sl = adapter.createSlice({ milestoneId: ms.data.id, number: 1, title: "S" });
	if (!sl.ok) throw new Error("slice create failed");
	return { adapter, sliceId: sl.data.id };
}

function installStores(adapter: SQLiteStateAdapter): void {
	mockClosableStateStores.db = adapter;
	mockClosableStateStores.sliceStore = adapter;
	mockClosableStateStores.milestoneStore = adapter;
	mockClosableStateStores.taskStore = adapter;
	mockClosableStateStores.projectStore = adapter;
	mockClosableStateStores.close = () => {};
	mockClosableStateStores.checkpoint = () => adapter.checkpoint();
}

beforeEach(() => {
	prevCwd = process.cwd();
	repo = mkdtempSync(join(tmpdir(), "tff-toctou-"));
	process.chdir(repo);
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("slice:transition TOCTOU re-check", () => {
	it("fails with PRECONDITION_VIOLATION when status is mutated between outer read and tx body", async () => {
		const { adapter, sliceId } = await setupAdapter();
		installStores(adapter);

		// Spy on getSlice: the first call (outer read, outside tx) returns "discussing",
		// but the second call (inside tx body re-check) returns "executing" — simulating
		// another writer racing between the outer read and the tx opening.
		// All subsequent calls (e.g. post-command assertions) fall through to real impl.
		let callCount = 0;
		const originalGetSlice = adapter.getSlice.bind(adapter);
		vi.spyOn(adapter, "getSlice").mockImplementation((id: string) => {
			callCount += 1;
			if (callCount === 2) {
				// Inner re-check: simulate race — another writer moved it to "executing".
				const real = originalGetSlice(id);
				if (real.ok && real.data) {
					return { ok: true as const, data: { ...real.data, status: "executing" as const } };
				}
			}
			// All other calls: outer read (call 1) and post-test assertions (call 3+) use real impl.
			return originalGetSlice(id);
		});

		const { sliceTransitionCmd } = await import("../../src/cli/commands/slice-transition.cmd.js");
		// We target "researching" (valid from "discussing"), but by tx time the slice
		// has been raced to "executing" — the inner re-check should detect the mismatch.
		const raw = await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");

		// DB must not have been mutated — the tx rolled back.
		const sliceResult = adapter.getSlice(sliceId);
		expect(sliceResult.ok).toBe(true);
		if (sliceResult.ok && sliceResult.data) {
			expect(sliceResult.data.status).toBe("discussing");
		}
	});

	it("succeeds normally when no race occurs", async () => {
		const { adapter } = await setupAdapter();
		installStores(adapter);

		const { sliceTransitionCmd } = await import("../../src/cli/commands/slice-transition.cmd.js");
		const raw = await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		expect(result.data.status).toBe("researching");
	});
});
