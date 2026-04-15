import { beforeEach, describe, expect, it } from "vitest";
import { checkStaleClaims } from "../../../../src/application/claims/check-stale-claims.js";
import { isOk } from "../../../../src/domain/result.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("InMemoryStateAdapter — claim + stale detection", () => {
	let adapter: InMemoryStateAdapter;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.saveProject({ name: "Test Project", vision: "Test Vision" });
		adapter.createMilestone({ number: 1, name: "M01" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S01", tier: "S" });
	});

	it("should record claimedAt timestamp on claim", () => {
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		const before = new Date();
		adapter.claimTask("M01-S01-T01");
		const result = adapter.getTask("M01-S01-T01");
		expect(isOk(result)).toBe(true);
		if (isOk(result) && result.data) {
			expect(result.data.status).toBe("in_progress");
			expect(result.data.claimedAt).toBeDefined();
			expect(result.data.claimedAt! >= before).toBe(true);
		}
	});

	it("should list stale claims exceeding TTL", () => {
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		adapter.createTask({ sliceId: "M01-S01", number: 2, title: "Task 2" });
		adapter.createTask({ sliceId: "M01-S01", number: 3, title: "Task 3" });

		// Manually set up stale claim by claiming then backdating
		adapter.claimTask("M01-S01-T01");
		const t1 = adapter.getTask("M01-S01-T01");
		if (isOk(t1) && t1.data) {
			t1.data.claimedAt = new Date(Date.now() - 31 * 60 * 1000);
		}

		adapter.claimTask("M01-S01-T02");

		const result = adapter.listStaleClaims(30);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0].id).toBe("M01-S01-T01");
		}
	});

	it("should return empty array when no stale claims", () => {
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		const result = adapter.listStaleClaims(30);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data).toHaveLength(0);
		}
	});
});

describe("checkStaleClaims use case", () => {
	let adapter: InMemoryStateAdapter;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.saveProject({ name: "Test Project", vision: "Test Vision" });
		adapter.createMilestone({ number: 1, name: "M01" });
		adapter.createSlice({ milestoneId: "M01", number: 1, title: "S01", tier: "S" });
	});

	it("should return stale claims with given TTL", async () => {
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task 1" });
		adapter.claimTask("M01-S01-T01");
		const t1 = adapter.getTask("M01-S01-T01");
		if (isOk(t1) && t1.data) {
			t1.data.claimedAt = new Date(Date.now() - 31 * 60 * 1000);
		}

		const result = await checkStaleClaims({ ttlMinutes: 30 }, { taskStore: adapter });
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.staleClaims).toHaveLength(1);
			expect(result.data.staleClaims[0].id).toBe("M01-S01-T01");
		}
	});
});
