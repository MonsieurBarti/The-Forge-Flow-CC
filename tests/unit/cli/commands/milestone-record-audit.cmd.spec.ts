import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";

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

function makeStores(): ClosableStateStores {
	return {
		milestoneStore: {
			getMilestoneByNumber: vi.fn().mockReturnValue({ ok: true, data: { id: "test-uuid" } }),
			createMilestone: vi.fn(),
			getMilestone: vi.fn(),
			listMilestones: vi.fn(),
			updateMilestone: vi.fn(),
			closeMilestone: vi.fn(),
		},
		milestoneAuditStore: {
			getAudit: vi.fn(),
			upsertAudit: vi.fn().mockReturnValue({ ok: true, data: undefined }),
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

describe("milestone:record-audit — notes validation", () => {
	it("rejects notes longer than 1000 characters with VALIDATION_ERROR", async () => {
		setMockStores(makeStores());
		const { milestoneRecordAuditCmd } = await import(
			"../../../../src/cli/commands/milestone-record-audit.cmd.js"
		);
		const longNotes = "a".repeat(1001);
		const result = JSON.parse(
			await milestoneRecordAuditCmd([
				"--milestone-id",
				"M01",
				"--verdict",
				"ready",
				"--notes",
				longNotes,
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("VALIDATION_ERROR");
	});

	it("rejects notes containing ASCII control characters with VALIDATION_ERROR", async () => {
		setMockStores(makeStores());
		const { milestoneRecordAuditCmd } = await import(
			"../../../../src/cli/commands/milestone-record-audit.cmd.js"
		);
		const notesWithControl = "clean\x01malicious";
		const result = JSON.parse(
			await milestoneRecordAuditCmd([
				"--milestone-id",
				"M01",
				"--verdict",
				"ready",
				"--notes",
				notesWithControl,
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("VALIDATION_ERROR");
	});

	it("accepts notes exactly 1000 characters", async () => {
		setMockStores(makeStores());
		const { milestoneRecordAuditCmd } = await import(
			"../../../../src/cli/commands/milestone-record-audit.cmd.js"
		);
		const maxNotes = "a".repeat(1000);
		const result = JSON.parse(
			await milestoneRecordAuditCmd([
				"--milestone-id",
				"M01",
				"--verdict",
				"ready",
				"--notes",
				maxNotes,
			]),
		);
		expect(result.ok).toBe(true);
	});

	it("accepts notes with newlines and tabs", async () => {
		setMockStores(makeStores());
		const { milestoneRecordAuditCmd } = await import(
			"../../../../src/cli/commands/milestone-record-audit.cmd.js"
		);
		const result = JSON.parse(
			await milestoneRecordAuditCmd([
				"--milestone-id",
				"M01",
				"--verdict",
				"ready",
				"--notes",
				"line1\nline2\ttabbed",
			]),
		);
		expect(result.ok).toBe(true);
	});
});
