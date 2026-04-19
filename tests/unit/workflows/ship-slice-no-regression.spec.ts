import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const extractStepsOneToEight = (markdown: string): string => {
	// Take everything from the first line that starts with "1. " (after "## Steps")
	// up to (but not including) the next "## " section header.
	const lines = markdown.split("\n");
	const stepsHeaderIdx = lines.findIndex((l) => l.trim() === "## Steps");
	if (stepsHeaderIdx === -1) throw new Error("## Steps not found");
	const afterSteps = lines.slice(stepsHeaderIdx + 1);
	const firstStepOne = afterSteps.findIndex((l) => /^1\.\s/.test(l));
	if (firstStepOne === -1) throw new Error("Step 1 not found");
	const fromStepOne = afterSteps.slice(firstStepOne);
	const nextSectionIdx = fromStepOne.findIndex((l) => l.startsWith("## "));
	const slice = nextSectionIdx === -1 ? fromStepOne : fromStepOne.slice(0, nextSectionIdx);
	return slice.join("\n").trimEnd();
};

describe("ship-slice.md no-regression", () => {
	it("Steps 1..8 bodies are byte-identical between the pre-routing snapshot and the current file", async () => {
		const before = await readFile(
			join(ROOT, "tests/fixtures/workflows/ship-slice-pre-routing.md"),
			"utf8",
		);
		const after = await readFile(join(ROOT, "workflows/ship-slice.md"), "utf8");
		expect(extractStepsOneToEight(after)).toBe(extractStepsOneToEight(before));
	});

	it("Step 0 invokes routing:extract with --json and routing:select-tier for all three agents", async () => {
		const after = await readFile(join(ROOT, "workflows/ship-slice.md"), "utf8");
		expect(after).toContain(
			"tff-tools routing:extract --slice-id <slice-id> --workflow tff:ship --json",
		);
		expect(after).toContain(
			"tff-tools routing:select-tier --slice-id <slice-id> --agent tff-spec-reviewer --signals '<signals-json>'",
		);
		expect(after).toContain(
			"tff-tools routing:select-tier --slice-id <slice-id> --agent tff-code-reviewer --signals '<signals-json>'",
		);
		expect(after).toContain(
			"tff-tools routing:select-tier --slice-id <slice-id> --agent tff-security-auditor --signals '<signals-json>'",
		);
	});
});
