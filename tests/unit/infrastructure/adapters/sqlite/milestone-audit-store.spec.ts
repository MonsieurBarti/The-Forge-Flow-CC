import { beforeEach, describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

describe("MilestoneAuditStore (SQLiteStateAdapter)", () => {
	let adapter: SQLiteStateAdapter;

	beforeEach(() => {
		adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		adapter.saveProject({ name: "Test" });
		adapter.createMilestone({ number: 1, name: "Milestone One" });
	});

	it("upsert + read returns latest record", () => {
		const ms = adapter.listMilestones();
		if (!ms.ok) throw ms.error;
		const milestoneId = ms.data[0].id;

		adapter.upsertAudit({
			milestoneId,
			verdict: "ready",
			auditedAt: "2026-04-19T10:00:00Z",
			notes: "clean",
		});

		const r = adapter.getLatestAudit(milestoneId);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data?.verdict).toBe("ready");
		expect(r.data?.notes).toBe("clean");
	});

	it("upsert replaces prior verdict", () => {
		const ms = adapter.listMilestones();
		if (!ms.ok) throw ms.error;
		const milestoneId = ms.data[0].id;

		adapter.upsertAudit({
			milestoneId,
			verdict: "not_ready",
			auditedAt: "2026-04-19T09:00:00Z",
		});
		adapter.upsertAudit({
			milestoneId,
			verdict: "ready",
			auditedAt: "2026-04-19T10:00:00Z",
		});

		const r = adapter.getLatestAudit(milestoneId);
		if (!r.ok) throw r.error;
		expect(r.data?.verdict).toBe("ready");
	});

	it("returns Ok(null) for unknown milestone", () => {
		const r = adapter.getLatestAudit("missing-uuid");
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data).toBeNull();
	});
});
