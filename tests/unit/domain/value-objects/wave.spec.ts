import { describe, expect, it } from "vitest";
import { WaveSchema } from "../../../../src/domain/value-objects/wave.js";

describe("Wave", () => {
	it("should accept a valid wave", () => {
		const wave = WaveSchema.parse({ index: 0, taskIds: ["t1", "t2"] });
		expect(wave.index).toBe(0);
		expect(wave.taskIds).toEqual(["t1", "t2"]);
	});

	it("should reject negative index", () => {
		expect(() => WaveSchema.parse({ index: -1, taskIds: ["t1"] })).toThrow();
	});

	it("should reject empty taskIds", () => {
		expect(() => WaveSchema.parse({ index: 0, taskIds: [] })).toThrow();
	});
});
