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

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		renameSync: (from: string, to: string) => mockRenameSync(from, to),
	};
});

let repo: string;
let prevCwd: string;

async function setupAdapter(): Promise<{ adapter: SQLiteStateAdapter; milestoneId: string }> {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	const ms = adapter.createMilestone({ number: 1, name: "M" });
	if (!ms.ok) throw new Error("milestone create failed");
	return { adapter, milestoneId: ms.data.id };
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
	repo = mkdtempSync(join(tmpdir(), "tff-slice-create-atom-"));
	process.chdir(repo);
	mockRenameSync.mockImplementation((from: string, to: string) => renameSync(from, to));
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("slice-create atomicity", () => {
	it("rolls back DB and cleans up PLAN.md.tmp when tx body throws", async () => {
		const { adapter, milestoneId } = await setupAdapter();
		installStores(adapter);

		const spy = vi.spyOn(adapter, "createSlice").mockImplementation(() => {
			throw new Error("injected body failure");
		});

		const { sliceCreateCmd } = await import("../../src/cli/commands/slice-create.cmd.js");
		const raw = await sliceCreateCmd(["--title", "Atomic slice", "--milestone-id", "M01"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TRANSACTION_ROLLBACK");

		spy.mockRestore();

		// DB: no slices created.
		const slices = adapter.listSlices(milestoneId);
		expect(slices.ok).toBe(true);
		if (slices.ok) expect(slices.data).toHaveLength(0);

		// No *.tmp leftovers.
		expect(listTmps(repo)).toEqual([]);
	});
});
