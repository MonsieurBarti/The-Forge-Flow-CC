import { describe, expect, it } from "vitest";
import { COMMAND_REGISTRY } from "../../src/cli/index.js";

describe("every registered command schema annotates mutates explicitly", () => {
	for (const [name, entry] of Object.entries(COMMAND_REGISTRY)) {
		it(`${name} has mutates: boolean (not undefined)`, () => {
			expect(typeof entry.schema.mutates).toBe("boolean");
		});
	}
});
