import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const WORKFLOWS_DIR = join(ROOT, "workflows");

describe("SS integration: workflow skill loading", () => {
	it("discuss-slice loads brainstorming and acceptance-criteria-validation", () => {
		const content = readFileSync(join(WORKFLOWS_DIR, "discuss-slice.md"), "utf-8");
		expect(content).toContain("@skills/brainstorming/SKILL.md");
		expect(content).toContain("@skills/acceptance-criteria-validation/SKILL.md");
		expect(content).toContain("@skills/stress-testing-specs/SKILL.md");
	});

	it("plan-slice loads writing-plans and architecture-review", () => {
		const content = readFileSync(join(WORKFLOWS_DIR, "plan-slice.md"), "utf-8");
		expect(content).toContain("@skills/writing-plans/SKILL.md");
		expect(content).toContain("@skills/architecture-review/SKILL.md");
	});

	it("execute-slice loads executing-plans and verification-before-completion", () => {
		const content = readFileSync(join(WORKFLOWS_DIR, "execute-slice.md"), "utf-8");
		expect(content).toContain("@skills/executing-plans/SKILL.md");
		expect(content).toContain("@skills/verification-before-completion/SKILL.md");
		expect(content).toContain("@skills/test-driven-development/SKILL.md");
	});

	it("verify-slice loads acceptance-criteria-validation and verification-before-completion", () => {
		const content = readFileSync(join(WORKFLOWS_DIR, "verify-slice.md"), "utf-8");
		expect(content).toContain("@skills/acceptance-criteria-validation/SKILL.md");
		expect(content).toContain("@skills/verification-before-completion/SKILL.md");
	});
});
