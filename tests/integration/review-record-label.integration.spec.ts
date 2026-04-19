import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DatabaseInit } from "../../src/domain/ports/database-init.port.js";
import type { JournalRepository } from "../../src/domain/ports/journal-repository.port.js";
import type { TransactionRunner } from "../../src/domain/ports/transaction-runner.port.js";
import type { ClosableStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

// vi.hoisted ensures these are available when vi.mock is hoisted to the top of the file
const { getAdapter, setAdapter } = vi.hoisted(() => {
	let _adapter: SQLiteStateAdapter | null = null;
	return {
		getAdapter: () => _adapter,
		setAdapter: (a: SQLiteStateAdapter) => {
			_adapter = a;
		},
	};
});

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn((): ClosableStateStores => {
		const adapter = getAdapter()!;
		return {
			db: adapter as unknown as DatabaseInit & TransactionRunner,
			projectStore: adapter,
			milestoneStore: adapter,
			sliceStore: adapter,
			taskStore: adapter,
			dependencyStore: adapter,
			sliceDependencyStore: adapter,
			sessionStore: adapter,
			reviewStore: adapter,
			journalRepository: { append: vi.fn(), read: vi.fn() } as unknown as JournalRepository,
			close: () => {},
			checkpoint: () => {},
		};
	}),
}));

function seedAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const ms = adapter.listMilestones();
	if (!ms.ok || ms.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = ms.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One" });
	return adapter;
}

beforeEach(() => {
	setAdapter(seedAdapter());
});

describe("review:record label resolution", () => {
	it("(a) records a review when given a valid label M01-S01", async () => {
		// Import after mock is in place
		const { reviewRecordCmd } = await import("../../src/cli/commands/review-record.cmd.js");
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M01-S01",
				"--agent",
				"reviewer",
				"--verdict",
				"approved",
				"--type",
				"code",
				"--commit-sha",
				"abc1234",
			]),
		);
		expect(result).toEqual({ ok: true, data: null });
	});

	it("(b) returns NOT_FOUND for unknown label M99-S99", async () => {
		const { reviewRecordCmd } = await import("../../src/cli/commands/review-record.cmd.js");
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M99-S99",
				"--agent",
				"reviewer",
				"--verdict",
				"approved",
				"--type",
				"code",
				"--commit-sha",
				"abc1234",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});
});
