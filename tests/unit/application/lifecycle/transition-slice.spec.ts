import { beforeEach, describe, expect, it, vi } from "vitest";
import { transitionSliceUseCase } from "../../../../src/application/lifecycle/transition-slice.js";
import { isErr, isOk } from "../../../../src/domain/result.js";
import { InMemoryStateAdapter } from "../../../../src/infrastructure/testing/in-memory-state-adapter.js";

describe("transitionSliceUseCase", () => {
	let adapter: InMemoryStateAdapter;
	let sliceId: string;

	beforeEach(() => {
		adapter = new InMemoryStateAdapter();
		adapter.saveProject({ name: "Test", vision: "v" });
		const msResult = adapter.createMilestone({ number: 1, name: "MVP" });
		const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
		const slResult = adapter.createSlice({ milestoneId, number: 1, title: "Auth" });
		sliceId = isOk(slResult) ? slResult.data.id : "M01-S01";
	});

	it("should transition slice and update store status", async () => {
		const result = await transitionSliceUseCase(
			{ sliceId, targetStatus: "researching" },
			{ sliceStore: adapter },
		);
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.slice.status).toBe("researching");
			expect(result.data.events).toHaveLength(1);
		}
	});

	it("should reject invalid transition", async () => {
		const result = await transitionSliceUseCase(
			{ sliceId, targetStatus: "executing" },
			{ sliceStore: adapter },
		);
		expect(isErr(result)).toBe(true);
		if (isErr(result)) expect(result.error.code).toBe("INVALID_TRANSITION");
	});
});

describe("transitionSlice with EventBus", () => {
	it("publishes SLICE_STATUS_CHANGED event via EventBus (AC13)", async () => {
		const adapter = new InMemoryStateAdapter();
		adapter.saveProject({ name: "Test", vision: "v" });
		const msResult = adapter.createMilestone({ number: 1, name: "M01" });
		const milestoneId = isOk(msResult) ? msResult.data.id : "M01";
		const slResult = adapter.createSlice({ milestoneId, number: 1, title: "Test" });
		const sliceId = isOk(slResult) ? slResult.data.id : "M01-S01";

		const publishFn = vi.fn();
		const eventBus = { publish: publishFn, subscribe: () => {} };

		const result = await transitionSliceUseCase(
			{ sliceId, targetStatus: "researching" },
			{ sliceStore: adapter, eventBus },
		);
		expect(isOk(result)).toBe(true);
		expect(publishFn).toHaveBeenCalledOnce();
		expect(publishFn.mock.calls[0][0].type).toBe("SLICE_STATUS_CHANGED");
	});
});
