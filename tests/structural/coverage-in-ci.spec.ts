import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");

interface Workflow {
	jobs?: Record<
		string,
		{
			steps?: Array<{ run?: string; name?: string }>;
			needs?: string | string[];
		}
	>;
}

describe("coverage gate wired in CI", () => {
	const ciPath = path.resolve(repoRoot, ".github/workflows/ci.yml");
	const workflow = yaml.load(fs.readFileSync(ciPath, "utf8")) as Workflow;

	it("has a `coverage` job", () => {
		expect(workflow.jobs).toBeDefined();
		expect(workflow.jobs?.coverage).toBeDefined();
	});

	it("coverage job runs `bun run test:coverage`", () => {
		const steps = workflow.jobs?.coverage?.steps ?? [];
		const hasStep = steps.some((s) => s.run?.includes("bun run test:coverage"));
		expect(hasStep).toBe(true);
	});

	it("package.json exposes a `test:coverage` script", () => {
		const pkg = JSON.parse(fs.readFileSync(path.resolve(repoRoot, "package.json"), "utf8")) as {
			scripts: Record<string, string>;
		};
		expect(pkg.scripts["test:coverage"]).toBeDefined();
		expect(pkg.scripts["test:coverage"]).toContain("vitest");
	});
});
