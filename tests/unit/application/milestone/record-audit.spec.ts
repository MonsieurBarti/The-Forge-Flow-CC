import { describe, expect, it, vi } from "vitest";
import { recordAuditUseCase } from "../../../../src/application/milestone/record-audit.js";

const makeStore = () => ({
	upsertAudit: vi.fn().mockReturnValue({ ok: true, data: undefined }),
	getLatestAudit: vi.fn(),
});

describe("recordAuditUseCase", () => {
	it("persists verdict via store with frozen timestamp", async () => {
		const store = makeStore();
		const res = await recordAuditUseCase(
			{ milestoneId: "m1", verdict: "ready", notes: "clean" },
			{
				milestoneAuditStore:
					store as unknown as import("../../../../src/domain/ports/milestone-audit-store.port.js").MilestoneAuditStore,
				now: () => new Date("2026-04-19T12:00:00Z"),
			},
		);
		expect(res.ok).toBe(true);
		expect(store.upsertAudit).toHaveBeenCalledWith({
			milestoneId: "m1",
			verdict: "ready",
			auditedAt: "2026-04-19T12:00:00.000Z",
			notes: "clean",
		});
	});

	it("propagates store error", async () => {
		const store = {
			upsertAudit: vi.fn().mockReturnValue({
				ok: false,
				error: { code: "WRITE_FAILURE", message: "boom" },
			}),
			getLatestAudit: vi.fn(),
		};
		const res = await recordAuditUseCase(
			{ milestoneId: "m1", verdict: "not_ready" },
			{
				milestoneAuditStore:
					store as unknown as import("../../../../src/domain/ports/milestone-audit-store.port.js").MilestoneAuditStore,
			},
		);
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.error.code).toBe("WRITE_FAILURE");
	});
});
