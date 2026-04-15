import { describe, expect, it } from "vitest";
import { BranchMetaSchema } from "../../../../src/domain/value-objects/branch-meta.js";

describe("BranchMeta", () => {
	it("should validate a valid branch meta", () => {
		const result = BranchMetaSchema.safeParse({
			stateId: "550e8400-e29b-41d4-a716-446655440000",
			codeBranch: "slice/M01-S01",
			parentStateBranch: "tff-state/milestone/M01",
			createdAt: "2026-03-31T12:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("should accept null parentStateBranch for root", () => {
		const result = BranchMetaSchema.safeParse({
			stateId: "550e8400-e29b-41d4-a716-446655440000",
			codeBranch: "main",
			parentStateBranch: null,
			createdAt: "2026-03-31T12:00:00Z",
		});
		expect(result.success).toBe(true);
	});

	it("should reject missing stateId", () => {
		const result = BranchMetaSchema.safeParse({
			codeBranch: "main",
			parentStateBranch: null,
			createdAt: "2026-03-31T12:00:00Z",
		});
		expect(result.success).toBe(false);
	});

	describe("restoredAt", () => {
		const validBase = {
			stateId: "550e8400-e29b-41d4-a716-446655440000",
			codeBranch: "milestone/M01",
			parentStateBranch: "tff-state/main",
			createdAt: "2026-04-01T10:00:00Z",
		};

		it("parses without restoredAt (backwards compat)", () => {
			const result = BranchMetaSchema.safeParse(validBase);
			expect(result.success).toBe(true);
		});

		it("parses with restoredAt", () => {
			const result = BranchMetaSchema.safeParse({
				...validBase,
				restoredAt: "2026-04-01T12:00:00Z",
			});
			expect(result.success).toBe(true);
			if (result.success) expect(result.data.restoredAt).toBe("2026-04-01T12:00:00Z");
		});

		it("rejects invalid restoredAt", () => {
			const result = BranchMetaSchema.safeParse({
				...validBase,
				restoredAt: "not-a-date",
			});
			expect(result.success).toBe(false);
		});
	});
});
