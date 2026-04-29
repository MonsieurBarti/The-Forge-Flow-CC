/**
 * worktree:create must work on a milestone branch.
 *
 * The whole point of `tff-tools worktree:create --slice-id <id>` is to spawn a
 * slice worktree from the milestone branch you're sitting on. Forcing the user
 * off the milestone branch first is impossible — that's what the worktree IS.
 *
 * conventions.md scopes milestone-branch-guard to exactly four commands:
 * slice:transition, task:claim, task:close, review:record. worktree:create is
 * NOT in that list.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOps } from "../../src/domain/ports/git-ops.port.js";
import type { JournalRepository } from "../../src/domain/ports/journal-repository.port.js";
import { Ok } from "../../src/domain/result.js";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

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

function unreachable(): never {
	throw new Error("unexpected call");
}

function makeGit(branch: string): GitOps {
	return {
		getCurrentBranch: async () => Ok(branch),
		detectDefaultBranch: async () => Ok("main"),
		createBranch: unreachable,
		createWorktree: async () => Ok(undefined),
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

afterEach(() => {
	delete process.env.TFF_ALLOW_MILESTONE_COMMIT;
});

describe("worktree:create on milestone branch", () => {
	it("must NOT be refused as REFUSED_ON_MILESTONE_BRANCH when sitting on the milestone branch with the open slice we want a worktree for", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const branch = `milestone/${prefix}`;
		const git = makeGit(branch);

		const { withMutatingCommand, resetMutatingCommandCache } = await import(
			"../../src/cli/utils/with-mutating-command.js"
		);
		resetMutatingCommandCache();
		const { worktreeCreateCmd } = await import("../../src/cli/commands/worktree-create.cmd.js");

		const wrapped = withMutatingCommand(worktreeCreateCmd, {
			gitFactory: () => git,
			commandName: "worktree:create",
		});
		const out = JSON.parse(await wrapped(["--slice-id", "M01-S01"]));

		// Whatever else might fail downstream (filesystem mocks, etc), the guard
		// itself MUST NOT refuse this command. It's the only path to escape the
		// milestone branch onto a slice worktree.
		if (!out.ok) {
			expect(out.error.code).not.toBe("REFUSED_ON_MILESTONE_BRANCH");
		}
	});
});
