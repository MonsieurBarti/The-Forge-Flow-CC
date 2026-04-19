import { describe, expect, it } from "vitest";
import { checkAuditPassed } from "../../../../src/application/milestone/check-audit-passed.js";
import type {
	MilestoneAuditRecord,
	MilestoneAuditStore,
} from "../../../../src/domain/ports/milestone-audit-store.port.js";

const makeStore = (record: MilestoneAuditRecord | null): MilestoneAuditStore =>
	({ getLatestAudit: () => ({ ok: true, data: record }) }) as unknown as MilestoneAuditStore;

describe("checkAuditPassed", () => {
	it("ok when audit verdict is ready", () => {
		const res = checkAuditPassed(
			"m1",
			makeStore({
				milestoneId: "m1",
				verdict: "ready",
				auditedAt: "2026-04-19T00:00:00Z",
			}),
		);
		expect(res.ok).toBe(true);
	});

	it("fails with AUDIT_REQUIRED when no record exists", () => {
		const res = checkAuditPassed("m1", makeStore(null));
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.error.code).toBe("AUDIT_REQUIRED");
	});

	it("fails with AUDIT_NOT_READY when last verdict was not_ready", () => {
		const res = checkAuditPassed(
			"m1",
			makeStore({
				milestoneId: "m1",
				verdict: "not_ready",
				auditedAt: "2026-04-19T00:00:00Z",
			}),
		);
		expect(res.ok).toBe(false);
		if (res.ok) return;
		expect(res.error.code).toBe("AUDIT_NOT_READY");
	});
});
