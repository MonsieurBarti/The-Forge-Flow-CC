import { describe, expect, it } from "vitest";
import { COMMAND_REGISTRY } from "../../src/cli/index.js";
import { isWrappedMutating } from "../../src/cli/utils/with-mutating-command.js";

describe("branch-guard chokepoint wiring", () => {
	it("every mutating schema resolves to a wrapped dispatcher", () => {
		const mutating = Object.entries(COMMAND_REGISTRY).filter(([, e]) => e.schema.mutates === true);
		expect(mutating.length).toBeGreaterThan(0);
		for (const [name, entry] of mutating) {
			expect(
				isWrappedMutating(entry.dispatcher),
				`command "${name}" has mutates: true but dispatcher is not wrapped`,
			).toBe(true);
		}
	});

	it("no non-mutating schema is wrapped", () => {
		const readonly = Object.entries(COMMAND_REGISTRY).filter(([, e]) => e.schema.mutates !== true);
		for (const [name, entry] of readonly) {
			expect(
				isWrappedMutating(entry.dispatcher),
				`command "${name}" is not mutates: true but dispatcher is wrapped`,
			).toBe(false);
		}
	});
});
