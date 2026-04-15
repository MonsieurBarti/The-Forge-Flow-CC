import { describe, expect, it } from "vitest";
import type { JournalRepository } from "../../../src/infrastructure/testing/journal-repository.port.js";

describe("JournalRepository port", () => {
	it("interface exists and is importable", () => {
		const port: JournalRepository = {
			append: () => ({ ok: true, data: 0 }),
			readAll: () => ({ ok: true, data: [] }),
			readSince: () => ({ ok: true, data: [] }),
			count: () => ({ ok: true, data: 0 }),
		};
		expect(port.append).toBeDefined();
		expect(port.readAll).toBeDefined();
		expect(port.readSince).toBeDefined();
		expect(port.count).toBeDefined();
	});
});
