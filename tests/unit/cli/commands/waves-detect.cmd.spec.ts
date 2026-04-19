import { describe, expect, it } from "vitest";
import {
	wavesDetectCmd,
	wavesDetectSchema,
} from "../../../../src/cli/commands/waves-detect.cmd.js";

describe("waves-detect command", () => {
	describe("schema", () => {
		it("should have optional --classify flag", () => {
			const classifyFlag = wavesDetectSchema.optionalFlags.find((f) => f.name === "classify");
			expect(classifyFlag).toBeDefined();
			expect(classifyFlag?.type).toBe("boolean");
		});

		it("should have optional --slice-tier flag", () => {
			const tierFlag = wavesDetectSchema.optionalFlags.find((f) => f.name === "slice-tier");
			expect(tierFlag).toBeDefined();
			expect(tierFlag?.type).toBe("string");
		});
	});

	describe("basic wave detection (no classification)", () => {
		it("should detect waves for independent tasks", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[]},{"id":"T02","dependsOn":[]}]',
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			// Without --classify, data is the waves array directly
			expect(parsed.data).toHaveLength(1);
			expect(parsed.data[0].taskIds).toEqual(["T01", "T02"]);
		});

		it("should detect waves for dependent tasks", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[]},{"id":"T02","dependsOn":["T01"]}]',
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			expect(parsed.data).toHaveLength(2);
			expect(parsed.data[0].taskIds).toEqual(["T01"]);
			expect(parsed.data[1].taskIds).toEqual(["T02"]);
		});
	});

	describe("with --classify flag", () => {
		it("should classify tasks when --classify is set", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[],"files":1,"keywords":["fix"]}]',
				"--classify",
				"--slice-tier",
				"S",
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			expect(parsed.data.tasks).toBeDefined();
			expect(parsed.data.tasks[0].difficulty).toBe("low");
			expect(parsed.data.tasks[0].profile).toBe("budget");
		});

		it("should classify medium difficulty tasks", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[],"files":3,"keywords":["update"],"hasDeps":false,"isDep":true,"waveDepth":1}]',
				"--classify",
				"--slice-tier",
				"SS",
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			expect(parsed.data.tasks[0].difficulty).toBe("medium");
			expect(parsed.data.tasks[0].profile).toBe("balanced");
		});

		it("should classify high difficulty tasks", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[],"files":10,"keywords":["refactor"],"hasDeps":true,"isDep":true,"waveDepth":2}]',
				"--classify",
				"--slice-tier",
				"SSS",
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			expect(parsed.data.tasks[0].difficulty).toBe("high");
			expect(parsed.data.tasks[0].profile).toBe("quality");
		});

		it("should use default values for missing classification fields", async () => {
			const result = await wavesDetectCmd([
				"--tasks",
				'[{"id":"T01","dependsOn":[]}]',
				"--classify",
				"--slice-tier",
				"S",
			]);
			const parsed = JSON.parse(result);
			expect(parsed.ok).toBe(true);
			// With default values (files=1, keywords=[], hasDeps=false, isDep=false, waveDepth=0)
			// Score should be low for S tier with minimal inputs
			expect(parsed.data.tasks[0].difficulty).toBe("low");
		});
	});
});
