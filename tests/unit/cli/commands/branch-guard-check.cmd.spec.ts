import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
			close: vi.fn(),
			checkpoint: vi.fn(),
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
	delete process.env.TFF_ALLOW_MILESTONE_COMMIT;
});

afterEach(() => {
	delete process.env.TFF_ALLOW_MILESTONE_COMMIT;
});

describe("branchGuardCheckCmd", () => {
	it("returns REFUSED_ON_DEFAULT_BRANCH when on default branch", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const git = makeGit("main", "main");
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
	});

	it("returns REFUSED_ON_MILESTONE_BRANCH when on milestone branch with open slices", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_MILESTONE_BRANCH");
	});

	it("returns ok:true on a non-milestone, non-default branch", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const git = makeGit("feature/my-feature", "main");

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		expect(result.ok).toBe(true);
		expect(result.data.branch).toBe("feature/my-feature");
		expect(result.data.violation).toBeNull();
	});

	it("returns ok:true on milestone branch with all slices closed", async () => {
		const { adapter, milestoneId } = seedAdapterAllClosed();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		expect(result.ok).toBe(true);
		expect(result.data.violation).toBeNull();
	});

	it("skips milestone check when TFF_ALLOW_MILESTONE_COMMIT=1", async () => {
		process.env.TFF_ALLOW_MILESTONE_COMMIT = "1";

		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		// On a milestone branch with open slices — normally would be refused
		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		// Milestone check is skipped, so passes
		expect(result.ok).toBe(true);
		expect(result.data.violation).toBeNull();
	});

	it("does NOT skip default-branch check when TFF_ALLOW_MILESTONE_COMMIT=1", async () => {
		process.env.TFF_ALLOW_MILESTONE_COMMIT = "1";

		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const git = makeGit("main", "main");

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		const result = JSON.parse(await cmd([]));

		// Default-branch check is NOT skipped by the env var
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
	});

	it("closes stores on milestone-branch violation", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");

		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const { branchGuardCheckCmd } = await import(
			"../../../../src/cli/commands/branch-guard-check.cmd.js"
		);
		const cmd = branchGuardCheckCmd(() => git);
		await cmd([]);

		const storesResult = vi.mocked(createClosableStateStoresUnchecked).mock.results[0];
		expect(storesResult?.type).toBe("return");
		if (storesResult?.type === "return") {
			expect(storesResult.value.close).toHaveBeenCalledTimes(1);
		}
	});
});
