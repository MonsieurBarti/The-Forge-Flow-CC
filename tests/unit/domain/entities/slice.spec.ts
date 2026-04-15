import { describe, expect, it } from "vitest";
import {
	createSlice,
	formatSliceId,
	SliceSchema,
	transitionSlice,
} from "../../../src/domain/slice.js";
import { isErr, isOk } from "../result.js";

describe("Slice", () => {
	const makeSlice = () =>
		createSlice({
			milestoneId: "M01",
			title: "Auth flow",
			milestoneNumber: 1,
			sliceNumber: 1,
		});

	it("should create a slice with human-readable id", () => {
		const slice = makeSlice();
		expect(slice.id).toBe("M01-S01");
		expect(slice.status).toBe("discussing");
		expect(slice.title).toBe("Auth flow");
		expect(slice.number).toBe(1);
	});

	it("should not have a sliceId field", () => {
		const slice = makeSlice();
		expect(slice).not.toHaveProperty("sliceId");
	});

	it("should format slice ID as M01-S01", () => {
		expect(formatSliceId(1, 1)).toBe("M01-S01");
		expect(formatSliceId(2, 12)).toBe("M02-S12");
	});

	it("should validate against schema", () => {
		expect(() => SliceSchema.parse(makeSlice())).not.toThrow();
	});

	describe("transitionSlice", () => {
		it("should allow valid transition discussing → researching", () => {
			const slice = makeSlice();
			const result = transitionSlice(slice, "researching");
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.slice.status).toBe("researching");
				expect(result.data.events).toHaveLength(1);
				expect(result.data.events[0].type).toBe("SLICE_STATUS_CHANGED");
			}
		});

		it("should use slice.id in transition errors", () => {
			const slice = makeSlice();
			const result = transitionSlice(slice, "executing");
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error.code).toBe("INVALID_TRANSITION");
				expect(result.error.context?.sliceId).toBe("M01-S01");
			}
		});

		it("should reject transition from closed", () => {
			const slice = { ...makeSlice(), status: "closed" as const };
			const result = transitionSlice(slice, "discussing");
			expect(isErr(result)).toBe(true);
		});
	});
});
