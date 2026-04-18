import { describe, expect, it, vi } from "vitest";
import { resolveMilestoneId, resolveSliceId } from "../../../../src/cli/utils/resolve-id.js";
import type { Milestone } from "../../../../src/domain/entities/milestone.js";
import type { Slice } from "../../../../src/domain/entities/slice.js";
import {
	createMockMilestoneStore,
	createMockSliceStore,
	ok,
} from "../../../helpers/mock-stores.js";

const fakeMilestone = (id: string): Milestone => ({
	id,
	projectId: "singleton",
	number: 1,
	name: "Test",
	status: "open",
	branch: "branch",
	createdAt: new Date(),
});

const fakeSlice = (id: string): Slice => ({
	id,
	milestoneId: "m-uuid",
	number: 1,
	title: "Test Slice",
	status: "discussing",
	createdAt: new Date(),
});

describe("resolveMilestoneId", () => {
	it("passes UUID through unchanged", () => {
		const store = createMockMilestoneStore();
		const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
		const result = resolveMilestoneId(uuid, store as never);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe(uuid);
		expect(store.getMilestoneByNumber).not.toHaveBeenCalled();
	});

	it("resolves M01 label to UUID", () => {
		const store = createMockMilestoneStore();
		vi.mocked(store.getMilestoneByNumber!).mockReturnValue(ok(fakeMilestone("resolved-uuid")));
		const result = resolveMilestoneId("M01", store as never);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe("resolved-uuid");
		expect(store.getMilestoneByNumber).toHaveBeenCalledWith(1);
	});

	it("returns ENTITY_NOT_FOUND for unknown label", () => {
		const store = createMockMilestoneStore();
		vi.mocked(store.getMilestoneByNumber!).mockReturnValue(ok(null));
		const result = resolveMilestoneId("M99", store as never);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("ENTITY_NOT_FOUND");
	});
});

describe("resolveSliceId", () => {
	it("passes UUID through unchanged", () => {
		const mStore = createMockMilestoneStore();
		const sStore = createMockSliceStore();
		const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
		const result = resolveSliceId(uuid, mStore as never, sStore as never);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe(uuid);
	});

	it("resolves M01-S02 label to UUID", () => {
		const mStore = createMockMilestoneStore();
		const sStore = createMockSliceStore();
		vi.mocked(sStore.getSliceByNumbers!).mockReturnValue(ok(fakeSlice("slice-uuid")));
		const result = resolveSliceId("M01-S02", mStore as never, sStore as never);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBe("slice-uuid");
		expect(sStore.getSliceByNumbers).toHaveBeenCalledWith(1, 2);
	});

	it("returns ENTITY_NOT_FOUND for unknown slice label", () => {
		const mStore = createMockMilestoneStore();
		const sStore = createMockSliceStore();
		vi.mocked(sStore.getSliceByNumbers!).mockReturnValue(ok(null));
		const result = resolveSliceId("M01-S99", mStore as never, sStore as never);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.code).toBe("ENTITY_NOT_FOUND");
	});
});
