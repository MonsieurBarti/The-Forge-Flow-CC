import { beforeEach, describe, expect, it } from "vitest";
import { resolveMilestoneId } from "../../../../src/application/milestone/resolve-milestone-id.js";
import type { Milestone } from "../../../../src/domain/entities/milestone.js";
import type { DomainError } from "../../../../src/domain/errors/domain-error.js";
import { createDomainError } from "../../../../src/domain/errors/domain-error.js";
import type { MilestoneStore } from "../../../../src/domain/ports/milestone-store.port.js";
import { Err, isErr, isOk, Ok, type Result } from "../../../../src/domain/result.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("resolveMilestoneId", () => {
	let adapter: InMemoryStateAdapter;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.init();
	});

	it("passes a UUID v4 through unchanged", () => {
		const uuid = "550e8400-e29b-41d4-a716-446655440000";
		const result = resolveMilestoneId(adapter, uuid);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toBe(uuid);
		}
	});

	it("resolves an M-label to the matching milestone UUID", () => {
		const created = adapter.createMilestone({ number: 1, name: "MVP" });
		expect(isOk(created)).toBe(true);
		const uuid = isOk(created) ? created.data.id : "";

		const result = resolveMilestoneId(adapter, "M01");

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toBe(uuid);
		}
	});

	it("resolves M-labels with arbitrary digit width (M1, M01, M001)", () => {
		const created = adapter.createMilestone({ number: 7, name: "Seven" });
		const uuid = isOk(created) ? created.data.id : "";

		for (const label of ["M7", "M07", "M007"]) {
			const result = resolveMilestoneId(adapter, label);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe(uuid);
			}
		}
	});

	it("returns NOT_FOUND when the M-label has no matching milestone", () => {
		adapter.createMilestone({ number: 1, name: "MVP" });

		const result = resolveMilestoneId(adapter, "M99");

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.code).toBe("NOT_FOUND");
			expect(result.error.message).toMatch(/M99/);
		}
	});

	it("returns INVALID_INPUT for garbage input", () => {
		for (const garbage of ["", "not-a-uuid", "01", "milestone-1", "M", "MX", "M01extra"]) {
			const result = resolveMilestoneId(adapter, garbage);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.code).toBe("INVALID_INPUT");
				expect(result.error.message).toContain(garbage);
			}
		}
	});

	it("propagates a store listMilestones READ_FAILURE as READ_FAILURE", () => {
		const failingStore: MilestoneStore = {
			createMilestone: () => Err(createDomainError("WRITE_FAILURE", "not used")),
			getMilestone: () => Ok(null),
			listMilestones: (): Result<Milestone[], DomainError> =>
				Err(createDomainError("WRITE_FAILURE", "db unavailable")),
			updateMilestone: () => Ok(undefined),
			closeMilestone: () => Ok(undefined),
		};

		const result = resolveMilestoneId(failingStore, "M01");

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.code).toBe("READ_FAILURE");
			expect(result.error.message).toContain("db unavailable");
		}
	});

	it("does not call listMilestones when the input is already a UUID", () => {
		let calls = 0;
		const spyStore: MilestoneStore = {
			createMilestone: () => Err(createDomainError("WRITE_FAILURE", "not used")),
			getMilestone: () => Ok(null),
			listMilestones: (): Result<Milestone[], DomainError> => {
				calls++;
				return Ok([]);
			},
			updateMilestone: () => Ok(undefined),
			closeMilestone: () => Ok(undefined),
		};

		const uuid = "550e8400-e29b-41d4-a716-446655440000";
		const result = resolveMilestoneId(spyStore, uuid);

		expect(isOk(result)).toBe(true);
		expect(calls).toBe(0);
	});
});
