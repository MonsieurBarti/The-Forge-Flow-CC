import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteStateAdapter } from "../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const { mockClosableStateStores } = vi.hoisted(() => ({
	mockClosableStateStores: {} as {
		db: unknown;
		sliceStore: unknown;
		milestoneStore: unknown;
		taskStore: unknown;
		projectStore: unknown;
		reviewStore: unknown;
		pendingJudgmentStore: unknown;
		close: () => void;
		checkpoint: () => void;
	},
}));

vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => mockClosableStateStores),
}));

let repo: string;
let prevCwd: string;

const installStores = (adapter: SQLiteStateAdapter): void => {
	mockClosableStateStores.db = adapter;
	mockClosableStateStores.sliceStore = adapter;
	mockClosableStateStores.milestoneStore = adapter;
	mockClosableStateStores.taskStore = adapter;
	mockClosableStateStores.projectStore = adapter;
	mockClosableStateStores.reviewStore = adapter;
	mockClosableStateStores.pendingJudgmentStore = adapter;
	mockClosableStateStores.close = () => {};
	mockClosableStateStores.checkpoint = () => adapter.checkpoint();
};

const setupAdapter = (): SQLiteStateAdapter => {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "P" });
	return adapter;
};

const seedSpecApproval = (adapter: SQLiteStateAdapter, sliceId: string, reviewer: string) =>
	adapter.recordReview({
		sliceId,
		reviewer,
		type: "spec",
		verdict: "approved",
		commitSha: "abc",
		createdAt: new Date().toISOString(),
	});

const seedReview = (
	adapter: SQLiteStateAdapter,
	sliceId: string,
	type: "code" | "security",
	reviewer: string,
) =>
	adapter.recordReview({
		sliceId,
		reviewer,
		type,
		verdict: "approved",
		commitSha: "abc",
		createdAt: new Date().toISOString(),
	});

const driveSliceToClosed = (adapter: SQLiteStateAdapter, sliceId: string): void => {
	for (const state of [
		"researching",
		"planning",
		"executing",
		"verifying",
		"reviewing",
		"completing",
	] as const) {
		expect(adapter.transitionSlice(sliceId, state).ok).toBe(true);
	}
	expect(seedReview(adapter, sliceId, "code", "rev-c").ok).toBe(true);
	expect(seedReview(adapter, sliceId, "security", "rev-s").ok).toBe(true);
	expect(adapter.transitionSlice(sliceId, "closed").ok).toBe(true);
};

beforeEach(() => {
	prevCwd = process.cwd();
	repo = mkdtempSync(join(tmpdir(), "tff-auto-archive-"));
	process.chdir(repo);
});

afterEach(() => {
	process.chdir(prevCwd);
	rmSync(repo, { recursive: true, force: true });
	vi.resetModules();
});

describe("auto-archive on milestone close", () => {
	it("renames .tff-cc/milestones/M01 → .tff-cc/archive/milestones/M01 and sets archived_at", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const ms = adapter.createMilestone({ number: 1, name: "M One" });
		expect(ms.ok).toBe(true);
		if (!ms.ok) throw new Error("ms");

		const slice = adapter.createSlice({
			milestoneId: ms.data.id,
			number: 1,
			title: "S One",
		});
		if (!slice.ok) throw new Error("slice");

		expect(seedSpecApproval(adapter, slice.data.id, "plannotator-1").ok).toBe(true);
		driveSliceToClosed(adapter, slice.data.id);
		// transitionSlice → closed queues a pending judgment; drain so close works.
		expect(adapter.clearPending(slice.data.id).ok).toBe(true);

		// Pre-populate the milestone dir on disk so the archive rename has work.
		const msDir = join(repo, ".tff-cc/milestones/M01");
		mkdirSync(msDir, { recursive: true });
		writeFileSync(join(msDir, "PLAN.md"), "plan");

		const { milestoneCloseCmd } = await import("../../src/cli/commands/milestone-close.cmd.js");
		const raw = await milestoneCloseCmd(["--milestone-id", "M01"]);
		const result = JSON.parse(raw);

		expect(result.ok).toBe(true);
		expect(result.data.archived?.db).toBe(true);
		expect(result.data.archived?.fs).toBe(true);

		// FS: source gone, destination present.
		expect(existsSync(msDir)).toBe(false);
		const archivedDir = join(repo, ".tff-cc/archive/milestones/M01");
		expect(existsSync(archivedDir)).toBe(true);
		expect(existsSync(join(archivedDir, "PLAN.md"))).toBe(true);

		// DB: archived_at set on milestone and slice.
		const reload = adapter.getMilestone(ms.data.id);
		expect(reload.ok).toBe(true);
		if (reload.ok && reload.data) expect(reload.data.archivedAt).toBeInstanceOf(Date);

		const reSlice = adapter.getSlice(slice.data.id);
		expect(reSlice.ok).toBe(true);
		if (reSlice.ok && reSlice.data) expect(reSlice.data.archivedAt).toBeInstanceOf(Date);
	});

	it("milestone slice close does NOT trigger individual archive (parent owns)", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const ms = adapter.createMilestone({ number: 1, name: "M One" });
		if (!ms.ok) throw new Error("ms");
		const slice = adapter.createSlice({
			milestoneId: ms.data.id,
			number: 1,
			title: "S One",
		});
		if (!slice.ok) throw new Error("slice");

		expect(seedSpecApproval(adapter, slice.data.id, "plannotator-1").ok).toBe(true);

		// Drive partly through; we close via slice:close cmd which is the path
		// that runs the post-tx archive hook.
		for (const state of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			expect(adapter.transitionSlice(slice.data.id, state).ok).toBe(true);
		}
		expect(seedReview(adapter, slice.data.id, "code", "rev-c").ok).toBe(true);
		expect(seedReview(adapter, slice.data.id, "security", "rev-s").ok).toBe(true);

		// The milestone-bound slice dir is at .tff-cc/milestones/M01/slices/M01-S01.
		const sliceDir = join(repo, ".tff-cc/milestones/M01/slices/M01-S01");
		mkdirSync(sliceDir, { recursive: true });
		writeFileSync(join(sliceDir, "PLAN.md"), "plan");

		const { sliceCloseCmd } = await import("../../src/cli/commands/slice-close.cmd.js");
		const raw = await sliceCloseCmd(["--slice-id", "M01-S01"]);
		const result = JSON.parse(raw);
		expect(result.ok).toBe(true);

		// Slice dir still on disk: milestone-bound slice is not individually archived.
		expect(existsSync(sliceDir)).toBe(true);
		// DB: archived_at still null on the slice.
		const re = adapter.getSlice(slice.data.id);
		expect(re.ok).toBe(true);
		if (re.ok && re.data) expect(re.data.archivedAt).toBeUndefined();
	});
});

describe("auto-archive on ad-hoc slice close", () => {
	it("quick slice close moves dir and sets archived_at", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		// Quick slice — no milestone.
		const slice = adapter.createSlice({
			kind: "quick",
			number: 1,
			title: "Quick fix",
		});
		if (!slice.ok) throw new Error("slice");

		// Drive to closed manually (slice-close uses sliceStore.transitionSlice).
		for (const state of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			expect(adapter.transitionSlice(slice.data.id, state).ok).toBe(true);
		}
		expect(seedSpecApproval(adapter, slice.data.id, "plannotator-1").ok).toBe(true);
		expect(seedReview(adapter, slice.data.id, "code", "rev-c").ok).toBe(true);
		expect(seedReview(adapter, slice.data.id, "security", "rev-s").ok).toBe(true);

		const quickDir = join(repo, ".tff-cc/quick/Q-01");
		mkdirSync(quickDir, { recursive: true });
		writeFileSync(join(quickDir, "PLAN.md"), "plan");

		const { sliceCloseCmd } = await import("../../src/cli/commands/slice-close.cmd.js");
		const raw = await sliceCloseCmd(["--slice-id", slice.data.id]);
		const result = JSON.parse(raw);
		expect(result.ok).toBe(true);

		expect(existsSync(quickDir)).toBe(false);
		expect(existsSync(join(repo, ".tff-cc/archive/quick/Q-01"))).toBe(true);

		const re = adapter.getSlice(slice.data.id);
		expect(re.ok).toBe(true);
		if (re.ok && re.data) expect(re.data.archivedAt).toBeInstanceOf(Date);
	});

	it("debug slice close moves dir and sets archived_at", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const slice = adapter.createSlice({
			kind: "debug",
			number: 1,
			title: "Debug",
		});
		if (!slice.ok) throw new Error("slice");

		for (const state of [
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"completing",
		] as const) {
			expect(adapter.transitionSlice(slice.data.id, state).ok).toBe(true);
		}
		expect(seedSpecApproval(adapter, slice.data.id, "plannotator-1").ok).toBe(true);
		expect(seedReview(adapter, slice.data.id, "code", "rev-c").ok).toBe(true);
		expect(seedReview(adapter, slice.data.id, "security", "rev-s").ok).toBe(true);

		const debugDir = join(repo, ".tff-cc/debug/D-01");
		mkdirSync(debugDir, { recursive: true });
		writeFileSync(join(debugDir, "REPRO.md"), "repro");

		const { sliceCloseCmd } = await import("../../src/cli/commands/slice-close.cmd.js");
		const raw = await sliceCloseCmd(["--slice-id", slice.data.id]);
		const result = JSON.parse(raw);
		expect(result.ok).toBe(true);

		expect(existsSync(debugDir)).toBe(false);
		expect(existsSync(join(repo, ".tff-cc/archive/debug/D-01"))).toBe(true);
	});
});

describe("slice:list --include-archived", () => {
	it("excludes archived slices by default and includes them with the flag", async () => {
		const adapter = setupAdapter();
		installStores(adapter);

		const ms = adapter.createMilestone({ number: 1, name: "M" });
		if (!ms.ok) throw new Error("ms");

		const live = adapter.createSlice({ milestoneId: ms.data.id, number: 1, title: "Live" });
		if (!live.ok) throw new Error("live");
		const arch = adapter.createSlice({ milestoneId: ms.data.id, number: 2, title: "Archived" });
		if (!arch.ok) throw new Error("arch");

		expect(adapter.archiveSlice(arch.data.id).ok).toBe(true);

		const { sliceListCmd } = await import("../../src/cli/commands/slice-list.cmd.js");

		// Default: hides archived.
		const defaultRaw = await sliceListCmd([]);
		const defaultResult = JSON.parse(defaultRaw);
		expect(defaultResult.ok).toBe(true);
		const defaultIds = (defaultResult.data as Array<{ id: string }>).map((s) => s.id);
		expect(defaultIds).toContain(live.data.id);
		expect(defaultIds).not.toContain(arch.data.id);

		// With flag: includes archived.
		const withRaw = await sliceListCmd(["--include-archived"]);
		const withResult = JSON.parse(withRaw);
		expect(withResult.ok).toBe(true);
		const withIds = (withResult.data as Array<{ id: string }>).map((s) => s.id);
		expect(withIds).toContain(live.data.id);
		expect(withIds).toContain(arch.data.id);
	});
});
