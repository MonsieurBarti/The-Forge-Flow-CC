import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("commands/tff/debug.md emits routing:event", () => {
	it("contains an invocation of `tff-tools routing:event --kind debug`", async () => {
		const md = await readFile("commands/tff/debug.md", "utf8");
		expect(md).toMatch(/tff-tools\s+routing:event\s+--kind\s+debug/);
	});
});
