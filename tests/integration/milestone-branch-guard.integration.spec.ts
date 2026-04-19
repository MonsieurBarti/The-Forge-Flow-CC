import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOps } from "../../src/domain/ports/git-ops.port.js";
import type { JournalRepository } from "../../src/domain/ports/journal-repository.port.js";
import { Ok } from "../../src/domain/result.js";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

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

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
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
			close: () => {},
			checkpoint: () => {},
		};
	}),
}));

/** A never-reached stub for GitOps methods we don't call in these tests. */
function unreachable(): never {
	throw new Error("unexpected call");
}

/** Build a minimal GitOps stub that returns the given branch name as current, and 'main' as default. */
function makeGit(branch: string): GitOps {
	return {
		getCurrentBranch: async () => Ok(branch),
		detectDefaultBranch: async () => Ok("main"),
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

type RawDb = { prepare(sql: string): { run(...args: unknown[]): void } };

/** Force all slices for a milestone to 'closed' directly via raw SQL. */
function closeAllSlices(adapter: SQLiteStateAdapter, milestoneId: string): void {
	(adapter as unknown as { db: RawDb }).db
		.prepare(
			"UPDATE slice SET status = 'closed', updated_at = datetime('now') WHERE milestone_id = ?",
		)
		.run(milestoneId);
}

/** Seed: project + 1 milestone + 1 open slice. Returns {milestoneId, sliceId}. */
function seedAdapter(): { adapter: SQLiteStateAdapter; milestoneId: string; sliceId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });

	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;

	adapter.createSlice({ milestoneId, number: 1, title: "Slice One" });

	const slicesR = adapter.listSlices(milestoneId);
	if (!slicesR.ok || slicesR.data.length === 0) throw new Error("No slices seeded");
	const sliceId = slicesR.data[0].id;

	return { adapter, milestoneId, sliceId };
}

beforeEach(() => {
	vi.resetModules();
});

describe("withBranchGuards — composed with reviewRecordCmd", () => {
	it("(a) refuses review:record when on milestone branch with open slices", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		// Derive the 8-hex prefix from the real milestone UUID
		const prefix = milestoneId.slice(0, 8);
		const branch = `milestone/${prefix}`;
		const git = makeGit(branch);

		const { withBranchGuards } = await import("../../src/cli/utils/with-branch-guards.js");
		const { reviewRecordCmd } = await import("../../src/cli/commands/review-record.cmd.js");

		const guarded = withBranchGuards("review:record", reviewRecordCmd, { gitFactory: () => git });
		const result = JSON.parse(await guarded([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_MILESTONE_BRANCH");
	});

	it("(b) does NOT refuse review:record when all slices are closed", async () => {
		const { adapter, milestoneId } = seedAdapter();
		// Close all slices before running the guard
		closeAllSlices(adapter, milestoneId);
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const branch = `milestone/${prefix}`;
		const git = makeGit(branch);

		const { withBranchGuards } = await import("../../src/cli/utils/with-branch-guards.js");
		const { reviewRecordCmd } = await import("../../src/cli/commands/review-record.cmd.js");

		const guarded = withBranchGuards("review:record", reviewRecordCmd, { gitFactory: () => git });
		const result = JSON.parse(await guarded([]));

		// Guard passes — the downstream command may fail for other reasons (missing args),
		// but it must NOT be a REFUSED_ON_MILESTONE_BRANCH error.
		if (!result.ok) {
			expect(result.error.code).not.toBe("REFUSED_ON_MILESTONE_BRANCH");
		}
	});
});
