import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonlJournalAdapter } from "../../src/infrastructure/adapters/journal/jsonl-journal.adapter.js";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const { mockClosableStateStores } = vi.hoisted(() => ({
	mockClosableStateStores: {} as {
		db: unknown;
		taskStore: unknown;
		journalRepository: unknown;
		close: () => void;
		checkpoint: () => void;
	},
}));

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

let repo: string;
let journalDir: string;
let prevCwd: string;

function setupAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	adapter.createMilestone({ number: 1, name: "M" });
	const slices = adapter.listMilestones();
	if (!slices.ok) throw new Error("failed to list milestones");
	const milestoneId = slices.data[0].id;
	const sliceResult = adapter.createSlice({ milestoneId, number: 1, title: "S" });
	if (!sliceResult.ok) throw new Error("failed to create slice");
	const sliceId = sliceResult.data.id;
	const taskResult = adapter.createTask({ sliceId, number: 1, title: "T" });
	if (!taskResult.ok) throw new Error("failed to create task");
	return adapter;
}

function installStores(adapter: SQLiteStateAdapter, journal: JsonlJournalAdapter): void {
	mockClosableStateStores.db = adapter;
	mockClosableStateStores.taskStore = adapter;
	mockClosableStateStores.journalRepository = journal;
	mockClosableStateStores.close = () => {};
	mockClosableStateStores.checkpoint = () => adapter.checkpoint();
}

beforeEach(() => {
	prevCwd = process.cwd();
	repo = mkdtempSync(join(tmpdir(), "tff-task-claim-atom-"));
	journalDir = join(repo, "journal");
	process.chdir(repo);
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("task-claim atomicity", () => {
	it("does not write a journal entry when the tx body throws", async () => {
		const adapter = setupAdapter();
		const journal = new JsonlJournalAdapter(journalDir);
		installStores(adapter, journal);

		// Find the first task and its slice for addressing.
		const ms = adapter.listMilestones();
		if (!ms.ok) throw new Error("listMilestones failed");
		const slices = adapter.listSlices(ms.data[0].id);
		if (!slices.ok) throw new Error("listSlices failed");
		const sliceId = slices.data[0].id;
		const taskId = `${sliceId}-T01`;

		// Inject a throw inside claimTask so the tx body rolls back.
		const spy = vi.spyOn(adapter, "claimTask").mockImplementation(() => {
			throw new Error("injected claim failure");
		});

		const { taskClaimCmd } = await import("../../src/cli/commands/task-claim.cmd.js");
		const raw = await taskClaimCmd(["--task-id", taskId, "--claimed-by", "x"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TRANSACTION_ROLLBACK");

		spy.mockRestore();

		// DB: task still open (rolled back).
		const t = adapter.getTask(taskId);
		expect(t.ok).toBe(true);
		if (t.ok && t.data) {
			expect(t.data.status).toBe("open");
		}

		// Journal: no file written for this slice (append never ran).
		const journalFile = join(journalDir, `${sliceId}.jsonl`);
		expect(existsSync(journalFile)).toBe(false);
	});
});
