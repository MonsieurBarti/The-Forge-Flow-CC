import { describe, expect, it } from "vitest";
import { routingExtractSchema } from "../../../../src/cli/commands/routing-extract.cmd.js";

describe("routing:extract schema", () => {
	it("declares slice-id and workflow as required flags", () => {
		const flagNames = routingExtractSchema.requiredFlags.map((f) => f.name);
		expect(flagNames).toEqual(
			expect.arrayContaining(["slice-id", "workflow"]),
		);
	});

	it("names the command 'routing:extract'", () => {
		expect(routingExtractSchema.name).toBe("routing:extract");
	});
});
