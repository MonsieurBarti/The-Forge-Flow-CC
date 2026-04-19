import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const { mockClosableStateStores, mockRenameSync } = vi.hoisted(() => {
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
		mockRenameSync: vi.fn<(from: string, to: string) => void>(),
	};
});

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

// Allow tests to override renameSync selectively.
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		renameSync: (from: string, to: string) => mockRenameSync(from, to),
	};
});

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
	// Keep the adapter alive across the cmd call so the spec can assert on
	// DB state after the command's finally closes its reference.
	mockClosableStateStores.close = () => {};
	mockClosableStateStores.checkpoint = () => adapter.checkpoint();
}

const listTmps = (dir: string): string[] => {
	const results: string[] = [];
	const walk = (p: string): void => {
		if (!existsSync(p)) return;
		for (const entry of readdirSync(p, { withFileTypes: true })) {
			const full = join(p, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith(".tmp")) results.push(full);
		}
	};
	walk(dir);
	return results;
};

beforeEach(() => {
	prevCwd = process.cwd();
	repo = mkdtempSync(join(tmpdir(), "tff-atom-"));
	process.chdir(repo);
	// Default: real rename behavior.
	mockRenameSync.mockImplementation((from: string, to: string) => renameSync(from, to));
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("slice-transition atomicity", () => {
	it("rolls back DB and cleans up tmps when tx body throws", async () => {
		const { adapter, sliceId } = await setupAdapter();
		installStores(adapter);

		// Force the transition inside the tx to throw.
		const spy = vi.spyOn(adapter, "transitionSlice").mockImplementation(() => {
			throw new Error("injected body failure");
		});

		const { sliceTransitionCmd } = await import("../../src/cli/commands/slice-transition.cmd.js");
		const raw = await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TRANSACTION_ROLLBACK");

		// DB: status should still be discussing.
		spy.mockRestore();
		const sliceResult = adapter.getSlice(sliceId);
		expect(sliceResult.ok).toBe(true);
		if (sliceResult.ok && sliceResult.data) {
			expect(sliceResult.data.status).toBe("discussing");
		}

		// No *.tmp files left in cwd.
		const leftovers = listTmps(repo);
		expect(leftovers).toEqual([]);
	});

	it("emits PARTIAL_SUCCESS warning when STATE.md rename fails but keeps DB committed", async () => {
		const { adapter, sliceId } = await setupAdapter();
		installStores(adapter);

		// Fail renames targeting STATE.md.
		mockRenameSync.mockImplementation((from: string, to: string) => {
			if (to.endsWith("STATE.md")) {
				throw new Error("injected rename failure for STATE.md");
			}
			return renameSync(from, to);
		});

		const { sliceTransitionCmd } = await import("../../src/cli/commands/slice-transition.cmd.js");
		const raw = await sliceTransitionCmd(["--slice-id", "M01-S01", "--status", "researching"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		expect(Array.isArray(result.warnings)).toBe(true);
		const partial = result.warnings.find((w: { code?: string }) => w?.code === "PARTIAL_SUCCESS");
		expect(partial).toBeDefined();
		expect(String(partial.context?.pendingEffect ?? "")).toContain("STATE.md");

		// DB committed.
		const slice = adapter.getSlice(sliceId);
		if (slice.ok && slice.data) {
			expect(slice.data.status).toBe("researching");
		}
	});
});
