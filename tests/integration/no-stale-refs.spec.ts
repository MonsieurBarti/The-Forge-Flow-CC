import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

const OLD_SKILL_NAMES = ["interactive-design", "debugging-methodology", "code-review-checklist"];
const DELETED_AGENTS = [
	"tff-brainstormer",
	"tff-architect",
	"tff-product-lead",
	"tff-tester",
	"tff-doc-writer",
	"tff-skill-drafter",
	"tff-backend-dev",
	"tff-frontend-dev",
	"tff-devops",
];

function scanDir(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => join(dir, f));
}

function scanSkillsDir(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((entry) => {
			const skillPath = join(dir, entry, "SKILL.md");
			return existsSync(skillPath);
		})
		.map((entry) => join(dir, entry, "SKILL.md"));
}

describe("No stale references integration test", () => {
	const allFiles = [
		...scanSkillsDir(join(ROOT, "skills")),
		...scanDir(join(ROOT, "agents")),
		...scanDir(join(ROOT, "workflows")),
	];

	it("should not reference old skill names", () => {
		for (const file of allFiles) {
			const content = readFileSync(file, "utf-8");
			for (const oldName of OLD_SKILL_NAMES) {
				expect(content).not.toContain(`skills/${oldName}/`);
			}
		}
	});

	it("should not reference deleted agents", () => {
		for (const file of allFiles) {
			const content = readFileSync(file, "utf-8");
			for (const deleted of DELETED_AGENTS) {
				expect(content).not.toContain(deleted);
			}
		}
	});
});
