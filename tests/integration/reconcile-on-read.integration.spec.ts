import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
			dependencyStore: unknown;
			sliceDependencyStore: unknown;
			sessionStore: unknown;
			reviewStore: unknown;
			journalRepository: unknown;
			close: () => void;
			checkpoint: () => void;
		},
	};
});

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

let repo: string;
let prevCwd: string;

function setupAdapter(): { adapter: SQLiteStateAdapter; milestoneId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	const ms = adapter.createMilestone({ number: 1, name: "M" });
	if (!ms.ok) throw new Error("milestone create failed");
	// Add a slice so the rendered STATE.md body has content.
	const sl = adapter.createSlice({ milestoneId: ms.data.id, number: 1, title: "S" });
	if (!sl.ok) throw new Error("slice create failed");
	return { adapter, milestoneId: ms.data.id };
}

function installStores(adapter: SQLiteStateAdapter): void {
	mockClosableStateStores.db = adapter;
	mockClosableStateStores.sliceStore = adapter;
	mockClosableStateStores.milestoneStore = adapter;
	mockClosableStateStores.taskStore = adapter;
	mockClosableStateStores.projectStore = adapter;
	mockClosableStateStores.dependencyStore = adapter;
	mockClosableStateStores.sliceDependencyStore = adapter;
	mockClosableStateStores.sessionStore = adapter;
	mockClosableStateStores.reviewStore = adapter;
	mockClosableStateStores.journalRepository = adapter;
	mockClosableStateStores.close = () => {};
	mockClosableStateStores.checkpoint = () => adapter.checkpoint();
}

beforeEach(() => {
	prevCwd = process.cwd();
	repo = mkdtempSync(join(tmpdir(), "tff-reconcile-on-read-"));
	mkdirSync(join(repo, ".tff-cc"), { recursive: true });
	process.chdir(repo);
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("reconcile-on-read integration", () => {
	it("slice:list regenerates stale STATE.md when an active milestone exists", async () => {
		const { adapter } = setupAdapter();
		installStores(adapter);

		const stateMdPath = join(repo, ".tff-cc", "STATE.md");
		writeFileSync(stateMdPath, "OLD CONTENT");

		const { sliceListCmd } = await import("../../src/cli/commands/slice-list.cmd.js");
		const raw = await sliceListCmd([]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		const updated = readFileSync(stateMdPath, "utf8");
		expect(updated).not.toBe("OLD CONTENT");
		expect(updated).toContain("# State — M");
	});

	it("milestone:list regenerates stale STATE.md when an active milestone exists", async () => {
		const { adapter } = setupAdapter();
		installStores(adapter);

		const stateMdPath = join(repo, ".tff-cc", "STATE.md");
		writeFileSync(stateMdPath, "OLD CONTENT");

		const { milestoneListCmd } = await import("../../src/cli/commands/milestone-list.cmd.js");
		const raw = await milestoneListCmd([]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		const updated = readFileSync(stateMdPath, "utf8");
		expect(updated).not.toBe("OLD CONTENT");
	});

	it("project:get regenerates stale STATE.md when an active milestone exists", async () => {
		const { adapter } = setupAdapter();
		installStores(adapter);

		const stateMdPath = join(repo, ".tff-cc", "STATE.md");
		writeFileSync(stateMdPath, "OLD CONTENT");

		const { projectGetCmd } = await import("../../src/cli/commands/project-get.cmd.js");
		const raw = await projectGetCmd([]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		const updated = readFileSync(stateMdPath, "utf8");
		expect(updated).not.toBe("OLD CONTENT");
	});

	it("slice:list skips reconcile when no active milestone exists (all closed)", async () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		adapter.saveProject({ name: "P" });
		const ms = adapter.createMilestone({ number: 1, name: "M" });
		if (!ms.ok) throw new Error("ms create failed");
		const closed = adapter.closeMilestone(ms.data.id);
		if (!closed.ok) throw new Error("close failed");
		installStores(adapter);

		const stateMdPath = join(repo, ".tff-cc", "STATE.md");
		writeFileSync(stateMdPath, "OLD CONTENT");

		const { sliceListCmd } = await import("../../src/cli/commands/slice-list.cmd.js");
		const raw = await sliceListCmd([]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		// No active milestone → reconcile skipped → file untouched.
		expect(readFileSync(stateMdPath, "utf8")).toBe("OLD CONTENT");
	});
});
