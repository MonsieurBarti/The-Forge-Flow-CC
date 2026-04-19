import { describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";

describe("DatabaseInit port", () => {
	it("includes a transaction method in the interface", () => {
		const stub: Pick<DatabaseInit, "transaction"> = {
			transaction: <T>(fn: () => T): T => fn(),
		};
		expect(stub.transaction(() => 42)).toBe(42);
	});
});
