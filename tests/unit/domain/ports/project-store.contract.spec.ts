import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseInit } from "../../../src/infrastructure/testing/database-init.port.js";
import type { ProjectStore } from "../../../src/infrastructure/testing/project-store.port.js";
import { isOk } from "../../src/result.js";

export const runProjectStoreContractTests = (
	name: string,
	createAdapter: () => ProjectStore & DatabaseInit,
) => {
	describe(`ProjectStore contract [${name}]`, () => {
		let store: ProjectStore & DatabaseInit;
		beforeEach(() => {
			store = createAdapter();
			store.init();
		});

		it("getProject returns null on empty db", () => {
			const result = store.getProject();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data).toBeNull();
		});

		it("saveProject creates project", () => {
			const result = store.saveProject({ name: "My Project" });
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.name).toBe("My Project");
				expect(result.data.id).toBeDefined();
			}
		});

		it("getProject returns saved project", () => {
			store.saveProject({ name: "Test" });
			const result = store.getProject();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).not.toBeNull();
				expect(result.data!.name).toBe("Test");
			}
		});

		it("saveProject upserts (updates existing)", () => {
			store.saveProject({ name: "V1" });
			store.saveProject({ name: "V2", vision: "Updated" });
			const result = store.getProject();
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data!.name).toBe("V2");
				expect(result.data!.vision).toBe("Updated");
			}
		});

		it("saveProject with optional vision", () => {
			const result = store.saveProject({ name: "P", vision: "V" });
			expect(isOk(result)).toBe(true);
			if (isOk(result)) expect(result.data.vision).toBe("V");
		});
	});
};

import { SQLiteStateAdapter } from "../../src/../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { InMemoryStateAdapter } from "../../src/../src/infrastructure/testing/in-memory-state-adapter.js";

runProjectStoreContractTests("SQLiteStateAdapter", () => SQLiteStateAdapter.createInMemory());
runProjectStoreContractTests("InMemoryStateAdapter", () => new InMemoryStateAdapter());
