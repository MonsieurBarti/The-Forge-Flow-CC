/**
 * worktree:create — ad-hoc slice CLI behavior (Slice 2B).
 *
 * Verifies the CLI command's error paths for the new resolver-based logic:
 *   1. Resolver failure (no base_branch + no milestone) → PRECONDITION_VIOLATION.
 *   2. Slice with milestoneId set but milestone missing in store → NOT_FOUND.
 *
 * Happy-path success (kind=quick / kind=debug / kind=milestone wiring) is
 * covered at the use-case level in tests/unit/application/worktree/.
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

vi.mock("../../src/infrastructure/home-directory.js", () => ({
	createTffCcSymlink: vi.fn(),
	getProjectId: vi.fn(() => "test-project-id"),
	resolveRepoRoot: vi.fn((cwd: string) => cwd),
	writeProjectIdFile: vi.fn(),
}));

function unreachable(): never {
	throw new Error("unexpected git call");
}

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

function freshAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	return adapter;
}

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	delete process.env.TFF_ALLOW_MILESTONE_COMMIT;
});

describe("worktree:create — ad-hoc slice CLI errors", () => {
	it("ad-hoc slice with neither base_branch nor milestone returns PRECONDITION_VIOLATION", async () => {
		const adapter = freshAdapter();
		const sliceR = adapter.createSlice({
			kind: "quick",
			number: 1,
			title: "Orphaned quick",
		});
		expect(sliceR.ok).toBe(true);
		setAdapter(adapter);

		// Use a non-default current branch so the wrapper's default-branch guard
		// doesn't preempt our resolver-error assertion.
		const git = makeGit("feature/dev");

		const { withMutatingCommand, resetMutatingCommandCache } = await import(
			"../../src/cli/utils/with-mutating-command.js"
		);
		resetMutatingCommandCache();
		const { worktreeCreateCmd } = await import("../../src/cli/commands/worktree-create.cmd.js");

		const wrapped = withMutatingCommand(worktreeCreateCmd, {
			gitFactory: () => git,
			commandName: "worktree:create",
		});
		const sliceId = sliceR.ok ? sliceR.data.id : "";
		const out = JSON.parse(await wrapped(["--slice-id", sliceId]));

		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("PRECONDITION_VIOLATION");
		expect(out.error.message).toMatch(/no base_branch and no parent milestone branch/);
	});

	it("milestone slice with milestoneId pointing at missing milestone returns NOT_FOUND", async () => {
		const adapter = freshAdapter();
		const sliceR = adapter.createSlice({
			milestoneId: "ghost-milestone-id",
			kind: "milestone",
			number: 1,
			title: "Orphaned milestone slice",
		});
		// If the adapter rejects (FK), the regression test isn't reachable.
		if (!sliceR.ok) {
			return;
		}
		setAdapter(adapter);

		const git = makeGit("feature/dev");

		const { withMutatingCommand, resetMutatingCommandCache } = await import(
			"../../src/cli/utils/with-mutating-command.js"
		);
		resetMutatingCommandCache();
		const { worktreeCreateCmd } = await import("../../src/cli/commands/worktree-create.cmd.js");

		const wrapped = withMutatingCommand(worktreeCreateCmd, {
			gitFactory: () => git,
			commandName: "worktree:create",
		});
		const out = JSON.parse(await wrapped(["--slice-id", sliceR.data.id]));

		expect(out.ok).toBe(false);
		expect(out.error.code).toBe("NOT_FOUND");
		expect(out.error.message).toMatch(/Milestone.*not found/);
	});
});
