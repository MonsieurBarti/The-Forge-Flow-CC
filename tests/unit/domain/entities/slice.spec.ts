import { describe, expect, it } from "vitest";
import {
	createSlice,
	SliceSchema,
	sliceLabel,
	transitionSlice,
} from "../../../../src/domain/entities/slice.js";
import { isErr, isOk } from "../../../../src/domain/result.js";

describe("Slice", () => {
	const makeSlice = () =>
		createSlice({
			milestoneId: "uuid-m01-1234-5678",
			milestoneNumber: 1,
			title: "Auth flow",
			sliceNumber: 1,
		});

	it("should create a slice with UUID id", () => {
		const slice = makeSlice();
		// ID should be a UUID, not a label
		expect(slice.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(slice.status).toBe("discussing");
		expect(slice.title).toBe("Auth flow");
		expect(slice.number).toBe(1);
	});

	it("should not have a sliceId field", () => {
		const slice = makeSlice();
		expect(slice).not.toHaveProperty("sliceId");
	});

	it("should format slice label as M##-S## via sliceLabel function", () => {
		expect(sliceLabel(1, 1)).toBe("M01-S01");
		expect(sliceLabel(2, 12)).toBe("M02-S12");
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
				// The sliceId in context should be the UUID
				expect(result.error.context?.sliceId).toBe(slice.id);
			}
		});

		it("should reject transition from closed", () => {
			const slice = { ...makeSlice(), status: "closed" as const };
			const result = transitionSlice(slice, "discussing");
			expect(isErr(result)).toBe(true);
		});
	});
});
