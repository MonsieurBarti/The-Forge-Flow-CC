import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

// vi.hoisted ensures factory refs are available when vi.mock is hoisted to file top
const { getMockStores, setMockStores } = vi.hoisted(() => {
	let _stores: ClosableStateStores | null = null;
	return {
		getMockStores: () => _stores!,
		setMockStores: (s: ClosableStateStores) => {
			_stores = s;
		},
	};
});

vi.mock("../../../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => getMockStores()),
}));

function makeStores(
	auditResult:
		| { ok: true; data: { milestoneId: string; verdict: string; auditedAt: string } | null }
		| { ok: false; error: { code: string; message: string } },
	milestoneResult:
		| { ok: true; data: { id: string } | null }
		| { ok: false; error: { code: string; message: string } } = {
		ok: true,
		data: { id: "test-uuid" },
	},
): ClosableStateStores {
	return {
		milestoneStore: {
			getMilestoneByNumber: vi.fn().mockReturnValue(milestoneResult),
			createMilestone: vi.fn(),
			getMilestone: vi.fn(),
			listMilestones: vi.fn(),
			updateMilestone: vi.fn(),
			closeMilestone: vi.fn(),
		},
		milestoneAuditStore: {
			getAudit: vi.fn().mockReturnValue(auditResult),
			upsertAudit: vi.fn(),
		},
		sliceStore: {} as ClosableStateStores["sliceStore"],
		taskStore: {} as ClosableStateStores["taskStore"],
		projectStore: {} as ClosableStateStores["projectStore"],
		dependencyStore: {} as ClosableStateStores["dependencyStore"],
		sliceDependencyStore: {} as ClosableStateStores["sliceDependencyStore"],
		sessionStore: {} as ClosableStateStores["sessionStore"],
		reviewStore: {} as ClosableStateStores["reviewStore"],
		journalRepository: {} as ClosableStateStores["journalRepository"],
		db: {} as ClosableStateStores["db"],
		close: vi.fn(),
		checkpoint: vi.fn(),
	} as unknown as ClosableStateStores;
}

beforeEach(() => {
	vi.resetAllMocks();
});

describe("milestone:audit-status", () => {
	it("returns NOT_FOUND when milestone label does not resolve", async () => {
		setMockStores(makeStores({ ok: true, data: null }, { ok: true, data: null }));

		const { milestoneAuditStatusCmd } = await import(
			"../../../../src/cli/commands/milestone-audit-status.cmd.js"
		);

		const result = JSON.parse(await milestoneAuditStatusCmd(["--milestone-id", "M99"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("returns ok with verdict ready when latest audit is ready", async () => {
		setMockStores(
			makeStores({
				ok: true,
				data: { milestoneId: "test-uuid", verdict: "ready", auditedAt: "2026-01-01T00:00:00Z" },
			}),
		);

		const { milestoneAuditStatusCmd } = await import(
			"../../../../src/cli/commands/milestone-audit-status.cmd.js"
		);

		const result = JSON.parse(await milestoneAuditStatusCmd(["--milestone-id", "M01"]));

		expect(result.ok).toBe(true);
		expect(result.data.verdict).toBe("ready");
	});

	it("returns AUDIT_NOT_READY when latest audit verdict is not_ready", async () => {
		setMockStores(
			makeStores({
				ok: true,
				data: { milestoneId: "test-uuid", verdict: "not_ready", auditedAt: "2026-01-01T00:00:00Z" },
			}),
		);

		const { milestoneAuditStatusCmd } = await import(
			"../../../../src/cli/commands/milestone-audit-status.cmd.js"
		);

		const result = JSON.parse(await milestoneAuditStatusCmd(["--milestone-id", "M01"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("AUDIT_NOT_READY");
	});

	it("returns AUDIT_REQUIRED when no audit record exists", async () => {
		setMockStores(makeStores({ ok: true, data: null }));

		const { milestoneAuditStatusCmd } = await import(
			"../../../../src/cli/commands/milestone-audit-status.cmd.js"
		);

		const result = JSON.parse(await milestoneAuditStatusCmd(["--milestone-id", "M01"]));

		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("AUDIT_REQUIRED");
	});

	it("calls stores.close() after execution", async () => {
		const stores = makeStores({ ok: true, data: null });
		setMockStores(stores);

		const { milestoneAuditStatusCmd } = await import(
			"../../../../src/cli/commands/milestone-audit-status.cmd.js"
		);

		await milestoneAuditStatusCmd(["--milestone-id", "M01"]);

		expect(stores.close).toHaveBeenCalledOnce();
	});
});
