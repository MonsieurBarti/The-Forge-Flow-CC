import { describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

const setup = () => {
	const adapter = SQLiteStateAdapter.createInMemory();
	const initR = adapter.init();
	if (!initR.ok) throw new Error(`init failed: ${initR.error.message}`);
	return adapter;
};

describe("SQLiteStateAdapter.transaction", () => {
	it("commits when the function returns", () => {
		const adapter = setup();
		const result = adapter.transaction(() => {
			adapter.saveProject({ name: "tx-test", vision: "x" });
			return "done";
		});
		expect(result).toBe("done");
		const p = adapter.getProject();
		expect(p.ok).toBe(true);
		if (p.ok && p.data) expect(p.data.name).toBe("tx-test");
		adapter.close();
	});

	it("rolls back when the function throws", () => {
		const adapter = setup();
		adapter.saveProject({ name: "original", vision: "v" });
		expect(() =>
			adapter.transaction(() => {
				adapter.saveProject({ name: "will-rollback", vision: "v" });
				throw new Error("boom");
			}),
		).toThrow("boom");
		const p = adapter.getProject();
		expect(p.ok).toBe(true);
		if (p.ok && p.data) expect(p.data.name).toBe("original");
		adapter.close();
	});
});
