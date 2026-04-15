import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../../src/domain/ports/database-init.port.js";
import type { SessionStore } from "../../../../src/domain/ports/session-store.port.js";
import { isOk } from "../../../../src/domain/result.js";

export const runSessionStoreContractTests = (
	name: string,
	createAdapter: () => SessionStore & DatabaseInit,
) => {
	describe(`SessionStore contract [${name}]`, () => {
		let store: SessionStore & DatabaseInit;
		beforeEach(() => {
			store = createAdapter();
			store.init();
		});

		it("getSession returns null on fresh db", () => {
			const result = store.getSession();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toBeNull();
		});

		it("saveSession + getSession round-trips", () => {
			store.saveSession({ phase: "executing", activeSliceId: "M01-S01" });
			const result = store.getSession();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.phase).toBe("executing");
				expect(result.data!.activeSliceId).toBe("M01-S01");
			}
		});

		it("saveSession overwrites previous (singleton)", () => {
			store.saveSession({ phase: "idle" });
			store.saveSession({ phase: "executing" });
			const result = store.getSession();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data!.phase).toBe("executing");
		});
	});
};

import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

runSessionStoreContractTests("SQLiteStateAdapter", () => SQLiteStateAdapter.createInMemory());
runSessionStoreContractTests("InMemoryStateAdapter", () => new InMemoryStateAdapter());
