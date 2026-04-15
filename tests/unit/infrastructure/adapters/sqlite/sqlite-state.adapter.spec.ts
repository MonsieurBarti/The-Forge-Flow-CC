import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../src/infrastructure/testing/sqlite-state.adapter.js";

describe("SQLiteStateAdapter — close + checkpoint", () => {
	it("close() should close the database connection", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		expect(() => adapter.close()).not.toThrow();
	});

	it("checkpoint() should succeed on WAL-mode database", () => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		expect(() => adapter.checkpoint()).not.toThrow();
	});
});
