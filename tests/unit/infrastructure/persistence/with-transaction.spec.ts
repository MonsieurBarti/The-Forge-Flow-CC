import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { withTransaction } from "../../../../src/infrastructure/persistence/with-transaction.js";

let tmp: string;
beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "with-tx-"));
});
afterEach(() => {
	rmSync(tmp, { recursive: true, force: true });
});

const setupAdapter = () => {
	const a = SQLiteStateAdapter.createInMemory();
	a.init();
	return a;
};

describe("withTransaction", () => {
	it("commits DB + renames staged tmps on success", async () => {
		const adapter = setupAdapter();
		const tmpPath = join(tmp, "foo.txt.tmp");
		const finalPath = join(tmp, "foo.txt");
		writeFileSync(tmpPath, "hello");

		const result = await withTransaction(adapter, () => {
			adapter.saveProject({ name: "ok", vision: "v" });
			return { data: 1, tmpRenames: [[tmpPath, finalPath]] as Array<[string, string]> };
		});

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe(1);
		expect(existsSync(finalPath)).toBe(true);
		expect(existsSync(tmpPath)).toBe(false);
		expect(readFileSync(finalPath, "utf8")).toBe("hello");
		adapter.close();
	});

	it("rolls back DB + auto-unlinks preStagedTmps when body throws", async () => {
		const adapter = setupAdapter();
		adapter.saveProject({ name: "before", vision: "v" });
		const tmpPath = join(tmp, "bar.txt.tmp");
		const finalPath = join(tmp, "bar.txt");
		writeFileSync(tmpPath, "staged");

		const result = await withTransaction(adapter, () => {
			adapter.saveProject({ name: "during", vision: "v" });
			throw new Error("boom");
		}, [tmpPath]);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("TRANSACTION_ROLLBACK");
		// Helper now auto-unlinks preStagedTmps on throw.
		expect(existsSync(tmpPath)).toBe(false);
		expect(existsSync(finalPath)).toBe(false);
		const p = adapter.getProject();
		if (p.ok && p.data) expect(p.data.name).toBe("before");
		adapter.close();
	});

	it("tolerates missing preStagedTmps during rollback cleanup", async () => {
		const adapter = setupAdapter();
		const nonexistent = join(tmp, "ghost.tmp");

		const result = await withTransaction(adapter, () => {
			throw new Error("boom");
		}, [nonexistent]);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("TRANSACTION_ROLLBACK");
		adapter.close();
	});

	it("defaults preStagedTmps to empty array (backward compatible)", async () => {
		const adapter = setupAdapter();
		const result = await withTransaction(adapter, () => {
			throw new Error("boom");
		});
		expect(result.ok).toBe(false);
		adapter.close();
	});

	it("emits PartialSuccessWarning + keeps DB committed when rename fails", async () => {
		const adapter = setupAdapter();
		const finalPath = join(tmp, "sub-that-does-not-exist", "out.txt");
		const tmpPath = join(tmp, "out.txt.tmp");
		writeFileSync(tmpPath, "payload");

		const result = await withTransaction(adapter, () => {
			adapter.saveProject({ name: "committed", vision: "v" });
			return { data: null, tmpRenames: [[tmpPath, finalPath]] as Array<[string, string]> };
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].code).toBe("PARTIAL_SUCCESS");
			expect(result.warnings[0].context?.pendingEffect).toContain("out.txt");
		}
		const p = adapter.getProject();
		if (p.ok && p.data) expect(p.data.name).toBe("committed");
		adapter.close();
	});
});
