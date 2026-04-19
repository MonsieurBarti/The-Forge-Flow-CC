import { describe, expect, it } from "vitest";
import type { TransactionRunner } from "../../../../src/domain/ports/transaction-runner.port.js";

describe("TransactionRunner port", () => {
	it("runs a synchronous body and returns its value", () => {
		const stub: TransactionRunner = {
			transaction: <T>(fn: () => T): T => fn(),
		};
		expect(stub.transaction(() => 42)).toBe(42);
	});

	it("propagates throws from the body", () => {
		const stub: TransactionRunner = {
			transaction: <T>(fn: () => T): T => fn(),
		};
		expect(() =>
			stub.transaction(() => {
				throw new Error("boom");
			}),
		).toThrow("boom");
	});
});
