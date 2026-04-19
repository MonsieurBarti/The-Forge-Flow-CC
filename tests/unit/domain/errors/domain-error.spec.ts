import { describe, expect, it } from "vitest";
import { alreadyClaimedError } from "../../../../src/domain/errors/already-claimed.error.js";
import {
	createDomainError,
	DomainErrorCodeSchema,
} from "../../../../src/domain/errors/domain-error.js";
import { hasOpenChildrenError } from "../../../../src/domain/errors/has-open-children.error.js";
import { versionMismatchError } from "../../../../src/domain/errors/version-mismatch.error.js";

describe("DomainErrorCodeSchema", () => {
	it("includes ALREADY_CLAIMED", () => {
		expect(DomainErrorCodeSchema.safeParse("ALREADY_CLAIMED").success).toBe(true);
	});
	it("includes VERSION_MISMATCH", () => {
		expect(DomainErrorCodeSchema.safeParse("VERSION_MISMATCH").success).toBe(true);
	});
	it("includes HAS_OPEN_CHILDREN", () => {
		expect(DomainErrorCodeSchema.safeParse("HAS_OPEN_CHILDREN").success).toBe(true);
	});
});

describe("DomainErrorCodeSchema S03 codes", () => {
	it("should accept new S03 error codes", () => {
		for (const code of [
			"SYNC_FAILED",
			"MERGE_CONFLICT",
			"CORRUPTED_STATE",
			"STATE_BRANCH_NOT_FOUND",
		]) {
			expect(DomainErrorCodeSchema.safeParse(code).success).toBe(true);
		}
	});
});

describe("DomainErrorCodeSchema S04 journal codes", () => {
	it("should accept journal error codes", () => {
		for (const code of [
			"JOURNAL_WRITE_FAILED",
			"JOURNAL_READ_FAILED",
			"JOURNAL_REPLAY_INCONSISTENT",
		]) {
			expect(DomainErrorCodeSchema.safeParse(code).success).toBe(true);
		}
	});

	it("should create journal domain errors with context", () => {
		const error = createDomainError("JOURNAL_READ_FAILED", "Corrupt entry at line 5", {
			lineNumber: 5,
		});
		expect(error.code).toBe("JOURNAL_READ_FAILED");
		expect(error.context?.lineNumber).toBe(5);
	});
});

describe("DomainErrorCodeSchema — hardening codes", () => {
	it.each([
		"REFUSED_ON_DEFAULT_BRANCH",
		"PRECONDITION_VIOLATION",
		"TRANSACTION_ROLLBACK",
		"PARTIAL_SUCCESS",
	])("accepts %s as a valid code", (code) => {
		expect(() => DomainErrorCodeSchema.parse(code)).not.toThrow();
	});

	it("throws on a code outside the enum (negative case)", () => {
		// Guard-rail: ensure the zod enum is strict so an adapter can't smuggle
		// an ad-hoc error code into the public shape without a schema bump.
		expect(() => DomainErrorCodeSchema.parse("NOT_A_REAL_CODE")).toThrow();
	});
});

describe("Error factories", () => {
	it("alreadyClaimedError creates correct error", () => {
		const err = alreadyClaimedError("task-1");
		expect(err.code).toBe("ALREADY_CLAIMED");
		expect(err.message).toContain("task-1");
	});
	it("versionMismatchError creates correct error", () => {
		const err = versionMismatchError(5, 3);
		expect(err.code).toBe("VERSION_MISMATCH");
		expect(err.message).toContain("5");
	});
	it("hasOpenChildrenError creates correct error", () => {
		const err = hasOpenChildrenError("milestone-1", 3);
		expect(err.code).toBe("HAS_OPEN_CHILDREN");
		expect(err.message).toContain("3");
	});
});
