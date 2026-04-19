import { describe, expect, it } from "vitest";
import { partialSuccessWarning } from "../../../../src/domain/errors/partial-success.warning.js";
import { preconditionViolationError } from "../../../../src/domain/errors/precondition-violation.error.js";
import { refusedOnDefaultBranchError } from "../../../../src/domain/errors/refused-on-default-branch.error.js";
import { transactionRollbackError } from "../../../../src/domain/errors/transaction-rollback.error.js";

describe("hardening error constructors", () => {
	it("refusedOnDefaultBranchError carries branch + command context", () => {
		const e = refusedOnDefaultBranchError("slice:transition", "main");
		expect(e.code).toBe("REFUSED_ON_DEFAULT_BRANCH");
		expect(e.message).toContain("slice:transition");
		expect(e.message).toContain("main");
		expect(e.context).toEqual({ command: "slice:transition", branch: "main" });
	});

	it("preconditionViolationError carries a violations array", () => {
		const violations = [
			{ code: "SLICE_STATUS_MISMATCH", expected: "planning", actual: "executing" },
		];
		const e = preconditionViolationError(violations);
		expect(e.code).toBe("PRECONDITION_VIOLATION");
		expect(e.context?.violations).toEqual(violations);
	});

	it("preconditionViolationError uses 'no details' fallback for empty violations array", () => {
		const e = preconditionViolationError([]);
		expect(e.message).toContain("no details");
	});

	it("transactionRollbackError wraps a cause", () => {
		const e = transactionRollbackError(new Error("disk full"));
		expect(e.code).toBe("TRANSACTION_ROLLBACK");
		expect(e.message).toContain("disk full");
	});

	it("partialSuccessWarning is structured with a pending-effect description", () => {
		const w = partialSuccessWarning("state.md regen failed: ENOSPC", "state.md");
		expect(w.code).toBe("PARTIAL_SUCCESS");
		expect(w.context).toEqual({ pendingEffect: "state.md" });
	});
});
