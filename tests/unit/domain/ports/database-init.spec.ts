import { describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import { Ok } from "../../../../src/domain/result.js";

describe("DatabaseInit port", () => {
	it("exposes init() returning a Result", () => {
		const stub: DatabaseInit = {
			init: () => Ok(undefined),
		};
		const r = stub.init();
		expect(r.ok).toBe(true);
	});
});
