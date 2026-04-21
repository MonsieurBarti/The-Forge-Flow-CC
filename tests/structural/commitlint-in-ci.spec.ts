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
			steps?: Array<{ run?: string; env?: Record<string, string> }>;
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
		const runContent = steps.map((s) => s.run ?? "").join("\n");
		const envContent = steps.map((s) => (s.env ? JSON.stringify(s.env) : "")).join("\n");
		const fullContent = `${runContent}\n${envContent}`;

		expect(fullContent).toMatch(/commitlint/);
		expect(fullContent).toMatch(/base\.sha/);
		expect(fullContent).toMatch(/head\.sha/);
	});
});
