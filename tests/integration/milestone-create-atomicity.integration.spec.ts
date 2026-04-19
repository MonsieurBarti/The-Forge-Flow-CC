import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const { mockClosableStateStores, mockRenameSync, mockCreateBranch } = vi.hoisted(() => {
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
		mockCreateBranch: vi.fn<(name: string, start: string) => Promise<void>>(),
	};
});

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

vi.mock("../../src/infrastructure/adapters/git/git-cli.adapter.js", () => ({
	GitCliAdapter: class {
		createBranch(name: string, start: string): Promise<void> {
			return mockCreateBranch(name, start);
		}
	},
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

function setupAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	return adapter;
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
	repo = mkdtempSync(join(tmpdir(), "tff-ms-create-atom-"));
	process.chdir(repo);
	mockRenameSync.mockImplementation((from: string, to: string) => renameSync(from, to));
	mockCreateBranch.mockResolvedValue();
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("milestone-create atomicity", () => {
	it("rolls back DB and cleans up REQUIREMENTS.md.tmp when tx body throws", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const spy = vi.spyOn(adapter, "createMilestone").mockImplementation(() => {
			throw new Error("injected body failure");
		});

		const { milestoneCreateCmd } = await import("../../src/cli/commands/milestone-create.cmd.js");
		const raw = await milestoneCreateCmd(["--name", "Atomic milestone"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TRANSACTION_ROLLBACK");

		spy.mockRestore();

		// DB: no milestones persisted.
		const ms = adapter.listMilestones();
		expect(ms.ok).toBe(true);
		if (ms.ok) expect(ms.data).toHaveLength(0);

		// No *.tmp leftovers.
		expect(listTmps(repo)).toEqual([]);
	});

	it("removes just-created milestone slices dir on rollback", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const slicesDir = join(repo, ".tff-cc", "milestones", "M01", "slices");
		expect(existsSync(slicesDir)).toBe(false);

		const spy = vi.spyOn(adapter, "createMilestone").mockImplementation(() => {
			throw new Error("injected body failure");
		});

		const { milestoneCreateCmd } = await import("../../src/cli/commands/milestone-create.cmd.js");
		const raw = await milestoneCreateCmd(["--name", "Atomic milestone"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		spy.mockRestore();

		// The slices dir (and its empty ancestors up to .tff-cc) must be gone.
		expect(existsSync(slicesDir)).toBe(false);
		expect(existsSync(join(repo, ".tff-cc", "milestones", "M01"))).toBe(false);
	});

	it("returns ok:true with PartialSuccessWarning when git branch creation fails (post-commit)", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		// Use the ACTUAL renameSync to avoid infinite recursion in this test's
		// mock wiring — we don't care about the rename here; we only care about
		// the git-branch post-commit warning.
		const { renameSync: actualRename } = await vi.importActual<typeof import("node:fs")>("node:fs");
		mockRenameSync.mockImplementation((from: string, to: string) => actualRename(from, to));

		mockCreateBranch.mockRejectedValueOnce(new Error("remote unavailable"));

		const { milestoneCreateCmd } = await import("../../src/cli/commands/milestone-create.cmd.js");
		const raw = await milestoneCreateCmd(["--name", "Post-commit warning"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		expect(result.data.milestone).toBeDefined();
		expect(Array.isArray(result.warnings)).toBe(true);
		const partial = result.warnings.find(
			(w: { code?: string; message?: string }) =>
				w?.code === "PARTIAL_SUCCESS" && String(w.message ?? "").includes("git branch"),
		);
		expect(partial).toBeDefined();
		expect(String(partial.message ?? "")).toContain("git branch creation failed");
		expect(String(partial.context?.pendingEffect ?? "")).toContain("git-branch:");

		// DB commit durable.
		const ms = adapter.listMilestones();
		expect(ms.ok).toBe(true);
		if (ms.ok) expect(ms.data).toHaveLength(1);
	});
});
