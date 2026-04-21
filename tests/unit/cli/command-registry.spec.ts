import { describe, expect, it } from "vitest";
import { COMMAND_REGISTRY } from "../../../src/cli/index.js";
import { isWrappedMutating } from "../../../src/cli/utils/with-mutating-command.js";

describe("COMMAND_REGISTRY", () => {
	it("wraps mutating commands with isWrappedMutating dispatcher", () => {
		// slice:create has mutates === true
		const entry = COMMAND_REGISTRY["slice:create"];
		expect(entry).toBeDefined();
		expect(isWrappedMutating(entry.dispatcher)).toBe(true);
	});

	it("does NOT wrap non-mutating commands", () => {
		// slice:list has mutates !== true (read-only)
		const entry = COMMAND_REGISTRY["slice:list"];
		expect(entry).toBeDefined();
		expect(isWrappedMutating(entry.dispatcher)).toBe(false);
	});

	it("has all expected top-level keys", () => {
		expect(Object.keys(COMMAND_REGISTRY).length).toBeGreaterThan(0);
		expect(COMMAND_REGISTRY["milestone:create"]).toBeDefined();
		expect(COMMAND_REGISTRY["project:init"]).toBeDefined();
		expect(COMMAND_REGISTRY.version).toBeDefined();
	});
});
