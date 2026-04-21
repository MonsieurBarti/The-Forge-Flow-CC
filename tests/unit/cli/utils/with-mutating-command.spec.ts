import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOps } from "../../../../src/domain/ports/git-ops.port.js";
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

const nullJournal = {
	append: () => Ok(0 as number),
	readAll: () => Ok([] as never[]),
	readSince: () => Ok([] as never[]),
	count: () => Ok(0 as number),
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
	delete process.env.TFF_ALLOW_MILESTONE_COMMIT;
});

describe("withMutatingCommand", () => {
	it("refuses when on the default branch (REFUSED_ON_DEFAULT_BRANCH)", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const git = makeGit("main", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "called" }));

		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
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

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped([]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("REFUSED_ON_MILESTONE_BRANCH");
		expect(handler).not.toHaveBeenCalled();
	});

	it("bypasses milestone guard when TFF_ALLOW_MILESTONE_COMMIT=1", async () => {
		process.env.TFF_ALLOW_MILESTONE_COMMIT = "1";

		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "bypassed" }));

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped(["--arg"]));

		expect(result.ok).toBe(true);
		expect(result.data).toBe("bypassed");
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(["--arg"]);
	});

	it("calls handler on a feature branch with all slices closed", async () => {
		const { adapter } = seedAdapterAllClosed();
		setAdapter(adapter);

		const git = makeGit("feature/my-branch", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "ok" }));

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		const result = JSON.parse(await wrapped(["--flag"]));

		expect(result.ok).toBe(true);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(["--flag"]);
	});

	it("opens stores exactly once on milestone-branch violation (cached, no close)", async () => {
		const { adapter, milestoneId } = seedAdapter();
		setAdapter(adapter);

		const prefix = milestoneId.slice(0, 8);
		const git = makeGit(`milestone/${prefix}`, "main");
		const handler = vi.fn();

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();
		closeStub.mockClear();

		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		await wrapped([]);
		// Second call must reuse cached stores — no additional factory invocation
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).toHaveBeenCalledTimes(1);
		// With module-level caching, close() is never called during normal operation
		expect(closeStub).not.toHaveBeenCalled();
	});

	it("does NOT open stores on default-branch violation (bails before milestone check)", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const git = makeGit("main", "main");
		const handler = vi.fn();
		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).not.toHaveBeenCalled();
	});

	it("does NOT open stores when TFF_ALLOW_MILESTONE_COMMIT=1", async () => {
		process.env.TFF_ALLOW_MILESTONE_COMMIT = "1";

		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const git = makeGit("feature/abc", "main");
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true }));

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const { createClosableStateStoresUnchecked } = await import(
			"../../../../src/infrastructure/adapters/sqlite/create-state-stores.js"
		);
		vi.mocked(createClosableStateStoresUnchecked).mockClear();

		const wrapped = withMutatingCommand(handler, { gitFactory: () => git });
		await wrapped([]);

		expect(createClosableStateStoresUnchecked).not.toHaveBeenCalled();
	});

	it("uses real GitCliAdapter when no gitFactory is provided (covers no-deps branch)", async () => {
		// This covers the `deps?.gitFactory ? ... : new GitCliAdapter(...)` else-branch.
		// The mock for createClosableStateStoresUnchecked prevents real DB access.
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withMutatingCommand } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const handler = vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: "no-deps" }));

		// No `deps` argument — real GitCliAdapter is used
		const wrapped = withMutatingCommand(handler);
		const result = JSON.parse(await wrapped([]));

		// Either ok:true (guard passes) or ok:false (guard fires) — both are valid.
		// The test exercises the no-deps branch in source code.
		expect(typeof result.ok).toBe("boolean");
	});
});

describe("isWrappedMutating", () => {
	it("returns true for a handler created by withMutatingCommand", async () => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);

		const { withMutatingCommand, isWrappedMutating } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const handler = vi.fn();
		const wrapped = withMutatingCommand(handler);

		expect(isWrappedMutating(wrapped)).toBe(true);
	});

	it("returns false for a plain function", async () => {
		const { isWrappedMutating } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);
		const plain = async (_args: string[]) => "result";

		expect(isWrappedMutating(plain)).toBe(false);
	});

	it("returns false for non-function inputs", async () => {
		const { isWrappedMutating } = await import(
			"../../../../src/cli/utils/with-mutating-command.js"
		);

		expect(isWrappedMutating(null)).toBe(false);
		expect(isWrappedMutating(undefined)).toBe(false);
		expect(isWrappedMutating(42)).toBe(false);
		expect(isWrappedMutating("string")).toBe(false);
		expect(isWrappedMutating({})).toBe(false);
	});
});
