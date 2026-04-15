import { describe, expect, it } from "vitest";
import {
	createClosableStateStores,
	createStateStores,
} from "../../../src/infrastructure/create-state-stores.js";

describe("createStateStores", () => {
	it("returns object with all 8 port keys", () => {
		const stores = createStateStores(":memory:");
		expect(stores).toHaveProperty("db");
		expect(stores).toHaveProperty("projectStore");
		expect(stores).toHaveProperty("milestoneStore");
		expect(stores).toHaveProperty("sliceStore");
		expect(stores).toHaveProperty("taskStore");
		expect(stores).toHaveProperty("dependencyStore");
		expect(stores).toHaveProperty("sessionStore");
		expect(stores).toHaveProperty("reviewStore");
	});

	it("factory with :memory: DB initializes successfully", () => {
		expect(() => createStateStores(":memory:")).not.toThrow();
	});

	it("init runs migrations (review table exists)", () => {
		const { projectStore, reviewStore } = createStateStores(":memory:");
		// Verify project works
		const saveResult = projectStore.saveProject({ name: "Test" });
		expect(saveResult.ok).toBe(true);
		// Verify reviewStore works (review table created by v2 migration)
		const listResult = reviewStore.listReviews("M01-S01");
		expect(listResult.ok).toBe(true);
	});
});

describe("createClosableStateStores", () => {
	it("should return stores with close and checkpoint methods", () => {
		const stores = createClosableStateStores(":memory:");
		expect(typeof stores.close).toBe("function");
		expect(typeof stores.checkpoint).toBe("function");
		stores.close();
	});
});
