import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");

interface Workflow {
	jobs?: Record<
		string,
		{
			if?: string;
			steps?: Array<{ run?: string }>;
		}
	>;
}

describe("commitlint gate wired in CI", () => {
	const ciPath = path.resolve(repoRoot, ".github/workflows/ci.yml");
	const workflow = yaml.load(fs.readFileSync(ciPath, "utf8")) as Workflow;

	it("has a `commitlint` job", () => {
		expect(workflow.jobs?.commitlint).toBeDefined();
	});

	it("commitlint job runs on pull_request events", () => {
		expect(workflow.jobs?.commitlint?.if).toContain("pull_request");
	});

	it("commitlint job invokes commitlint with base/head sha range", () => {
		const steps = workflow.jobs?.commitlint?.steps ?? [];
		const joined = steps.map((s) => s.run ?? "").join("\n");
		expect(joined).toMatch(/commitlint/);
		expect(joined).toMatch(/base\.sha/);
		expect(joined).toMatch(/head\.sha/);
	});
});
