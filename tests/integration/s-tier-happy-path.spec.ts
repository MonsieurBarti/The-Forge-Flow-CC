import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SKILLS_DIR = join(ROOT, "skills");
const AGENTS_DIR = join(ROOT, "agents");
const WORKFLOWS_DIR = join(ROOT, "workflows");

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

describe("S-tier integration: skill/agent/workflow consistency", () => {
	it("should have exactly 4 agent files", () => {
		const agents = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
		expect(agents).toHaveLength(4);
	});

	it("should have no deleted agent references in workflows", () => {
		const workflows = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".md"));
		for (const wf of workflows) {
			const content = readFileSync(join(WORKFLOWS_DIR, wf), "utf-8");
			for (const deleted of DELETED_AGENTS) {
				expect(content).not.toContain(deleted);
			}
		}
	});

	it("should have all skills referenced by agents", () => {
		const agents = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md"));
		for (const agent of agents) {
			const content = readFileSync(join(AGENTS_DIR, agent), "utf-8");
			const skillRefs = content.match(/skill:\s*([^\s\n]+)/g) || [];
			for (const ref of skillRefs) {
				const skillName = ref.replace("skill:", "").trim();
				const skillPath = join(SKILLS_DIR, skillName, "SKILL.md");
				expect(existsSync(skillPath)).toBe(true);
			}
		}
	});
});
