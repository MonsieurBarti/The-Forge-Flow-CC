import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOps } from "../../../../src/domain/ports/git-ops.port.js";
import type { JournalRepository } from "../../../../src/domain/ports/journal-repository.port.js";
import { Ok } from "../../../../src/domain/result.js";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

// vi.hoisted ensures the captured adapter reference is available when vi.mock is hoisted
const { getAdapter, setAdapter } = vi.hoisted(() => {
	let _adapter: SQLiteStateAdapter | null = null;
	return {
		getAdapter: () => _adapter,
		setAdapter: (a: SQLiteStateAdapter) => {
			_adapter = a;
		},
	};
});

const closeStub = vi.fn();

const nullJournal: JournalRepository = {
	append: () => Ok(0),
	readAll: () => Ok([]),
	readSince: () => Ok([]),
	count: () => Ok(0),
};

vi.mock("../../../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn((): ClosableStateStores => {
		const adapter = getAdapter()!;
		return {
			db: adapter,
			projectStore: adapter,
			milestoneStore: adapter,
			sliceStore: adapter,
			taskStore: adapter,
			dependencyStore: adapter,
			sliceDependencyStore: adapter,
			sessionStore: adapter,
			reviewStore: adapter,
			milestoneAuditStore: adapter,
			journalRepository: nullJournal,
			close: closeStub,
			checkpoint: () => {},
		};
	}),
}));

function unreachable(): never {
	throw new Error("unexpected call");
}

function makeGit(currentBranch: string, defaultBranch = "main"): GitOps {
	return {
		getCurrentBranch: vi.fn().mockResolvedValue(Ok(currentBranch)),
		detectDefaultBranch: vi.fn().mockResolvedValue(Ok(defaultBranch)),
		createBranch: unreachable,
		createWorktree: unreachable,
		deleteWorktree: unreachable,
		listWorktrees: unreachable,
		commit: unreachable,
		revert: unreachable,
		merge: unreachable,
		getHeadSha: unreachable,
		createOrphanWorktree: unreachable,
		checkoutWorktree: unreachable,
		branchExists: unreachable,
		deleteBranch: unreachable,
		pruneWorktrees: unreachable,
		lsTree: unreachable,
		extractFile: unreachable,
		pushBranch: unreachable,
		fetchBranch: unreachable,
	};
}

function seedAdapter(): { adapter: SQLiteStateAdapter; milestoneId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });

	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;

	adapter.createSlice({ milestoneId, number: 1, title: "Slice One" });
	return { adapter, milestoneId };
}

function seedAdapterAllClosed(): { adapter: SQLiteStateAdapter; milestoneId: string } {
	const result = seedAdapter();
	type RawDb = { prepare(sql: string): { run(...args: unknown[]): void } };
	(result.adapter as unknown as { db: RawDb }).db
		.prepare(
			"UPDATE slice SET status = 'closed', updated_at = datetime('now') WHERE milestone_id = ?",
		)
		.run(result.milestoneId);
	return result;
}

beforeEach(() => {
	vi.resetModules();
	closeStub.mockClear();
});

describe("withBranchGuards", () => {
	it("refuses on default branch (REFUSED_ON_DEFAULT_BRANCH)", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const git = makeGit("main", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "called" }));

		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
		expect(handler).not.toHaveBeenCalled();
	});

	it("refuses on milestone branch with open slices (REFUSED_ON_MILESTONE_BRANCH)", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "called" }));

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_MILESTONE_BRANCH");
		expect(handler).not.toHaveBeenCalled();
	});

	it("calls handler when on milestone branch with all slices closed", async () => {
		const { adapter, milestoneId } = seedAdapterAllClosed();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "result" }));

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped(["--flag"]));

		expect(result.ok).toBe(true);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(["--flag"]);
	});

	it("calls handler on a plain feature branch", async () => {
		const { adapter } = seedAdapterAllClosed();
		setAdapter(adapter);

		const git = makeGit("feature/my-branch", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "ok" }));

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped([]));

		expect(result.ok).toBe(true);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("does NOT open stores on default-branch violation (bails before reaching milestone check)", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const git = makeGit("main", "main");
		const handler = vi.fn();
		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).not.toHaveBeenCalled();
	});

	it("closes stores on milestone-branch violation", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");
		const handler = vi.fn();

		const beforeCount = closeStub.mock.calls.length;

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).toHaveBeenCalledTimes(1);
		expect(closeStub.mock.calls.length).toBe(beforeCount + 1);
	});

	it("closes stores on successful handler invocation", async () => {
		const { adapter } = seedAdapterAllClosed();
		setAdapter(adapter);

		const git = makeGit("feature/abc", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true }));

		const beforeCount = closeStub.mock.calls.length;

		const { withBranchGuards } = await import("../../../../src/cli/utils/with-branch-guards.js");
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const wrapped = withBranchGuards("test:cmd", handler, { gitFactory: () => git });
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).toHaveBeenCalledTimes(1);
		expect(closeStub.mock.calls.length).toBe(beforeCount + 1);
	});
});
