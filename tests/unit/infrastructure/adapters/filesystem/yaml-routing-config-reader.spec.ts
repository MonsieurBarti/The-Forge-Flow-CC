import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { YamlRoutingConfigReader } from "../../../../../src/infrastructure/adapters/filesystem/yaml-routing-config-reader.js";

describe("YamlRoutingConfigReader", () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "routing-cfg-"));
		await mkdir(join(dir, ".tff-cc"), { recursive: true });
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const write = (contents: string) =>
		writeFile(join(dir, ".tff-cc/settings.yaml"), contents, "utf8");

	it("returns disabled default when settings.yaml has no routing section", async () => {
		await write("autonomy:\n  mode: guided\n");
		const reader = new YamlRoutingConfigReader({ projectRoot: dir });
		const res = await reader.readConfig();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.enabled).toBe(false);
	});

	it("parses a full routing block", async () => {
		await write(
			`routing:
  enabled: true
  llm_enrichment:
    enabled: true
    model: claude-haiku-4-5-20251001
    timeout_ms: 5000
  confidence_threshold: 0.5
  logging:
    path: .tff-cc/logs/routing.jsonl
`,
		);
		const reader = new YamlRoutingConfigReader({ projectRoot: dir });
		const res = await reader.readConfig();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.enabled).toBe(true);
		expect(res.data.confidence_threshold).toBe(0.5);
		expect(res.data.llm_enrichment.model).toBe("claude-haiku-4-5-20251001");
	});

	it("returns disabled default when settings.yaml does not exist", async () => {
		const reader = new YamlRoutingConfigReader({ projectRoot: dir });
		const res = await reader.readConfig();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.enabled).toBe(false);
	});

});

describe("YamlRoutingConfigReader.readPool", () => {
	let tmp: string;

	const mkProject = async (): Promise<string> => {
		const dir = await mkdtemp(join(tmpdir(), "yaml-routing-pool-"));
		await mkdir(join(dir, ".tff-cc"), { recursive: true });
		await mkdir(join(dir, "agents"), { recursive: true });
		await mkdir(join(dir, "commands", "tff"), { recursive: true });
		return dir;
	};

	const writeAgent = async (dir: string, id: string, handles: string[], priority = 10) => {
		await writeFile(
			join(dir, "agents", `${id}.md`),
			`---\nname: ${id}\nmodel: opus\nrouting:\n  handles: [${handles.join(", ")}]\n  priority: ${priority}\n  min_tier: haiku\n---\n\n# ${id}\n`,
		);
	};

	const writeShipFrontmatter = async (dir: string, poolLines: string[]) => {
		await writeFile(
			join(dir, "commands", "tff", "ship.md"),
			`---\nname: tff:ship\nrouting:\n  pool:\n${poolLines.map((l) => "    - " + l).join("\n")}\n---\n\nbody\n`,
		);
	};

	beforeEach(async () => {
		tmp = await mkProject();
	});
	afterEach(async () => {
		await rm(tmp, { recursive: true, force: true });
	});

	it("loads a pool from command frontmatter and hydrates AgentCapability", async () => {
		await writeAgent(tmp, "tff-spec-reviewer", ["standard_review"], 10);
		await writeAgent(tmp, "tff-code-reviewer", ["standard_review", "code_quality"], 10);
		await writeShipFrontmatter(tmp, ["tff-spec-reviewer", "tff-code-reviewer"]);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.workflow_id).toBe("tff:ship");
		expect(res.data.default_agent).toBe("tff-spec-reviewer");
		expect(res.data.agents.map((a) => a.id)).toEqual([
			"tff-spec-reviewer",
			"tff-code-reviewer",
		]);
		expect(res.data.agents[1].handles).toEqual(["standard_review", "code_quality"]);
	});

	it("settings.yaml routing.pools.<workflow> overrides frontmatter wholesale", async () => {
		await writeAgent(tmp, "tff-spec-reviewer", ["a"]);
		await writeAgent(tmp, "tff-code-reviewer", ["b"]);
		await writeAgent(tmp, "tff-security-auditor", ["c"]);
		await writeShipFrontmatter(tmp, ["tff-spec-reviewer"]);
		await writeFile(
			join(tmp, ".tff-cc", "settings.yaml"),
			`routing:\n  enabled: true\n  pools:\n    tff:ship:\n      - tff-code-reviewer\n      - tff-security-auditor\n`,
		);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.agents.map((a) => a.id)).toEqual([
			"tff-code-reviewer",
			"tff-security-auditor",
		]);
	});

	it("returns ROUTING_CONFIG error for unknown agent id", async () => {
		await writeShipFrontmatter(tmp, ["tff-ghost"]);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
		if (isOk(res)) return;
		expect(res.error.code).toBe("ROUTING_CONFIG");
	});

	it("returns error for duplicate ids", async () => {
		await writeAgent(tmp, "tff-spec-reviewer", ["x"]);
		await writeShipFrontmatter(tmp, ["tff-spec-reviewer", "tff-spec-reviewer"]);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});

	it("returns error for empty pool", async () => {
		await writeFile(
			join(tmp, "commands", "tff", "ship.md"),
			`---\nname: tff:ship\nrouting:\n  pool: []\n---\n\n`,
		);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});

	it("returns error for invalid agent id regex", async () => {
		await writeShipFrontmatter(tmp, ["BAD_NAME"]);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});

	it("returns error when neither frontmatter nor settings declares a pool", async () => {
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});

	it("surfaces a settings.yaml parse error rather than falling through", async () => {
		await writeAgent(tmp, "tff-spec-reviewer", ["x"]);
		await writeShipFrontmatter(tmp, ["tff-spec-reviewer"]);
		await writeFile(
			join(tmp, ".tff-cc", "settings.yaml"),
			"routing:\n  pools:\n    tff:ship: [oops\n",
		);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});

	it("surfaces a command frontmatter parse error rather than falling through", async () => {
		await writeFile(
			join(tmp, "commands", "tff", "ship.md"),
			"---\nrouting:\n  pool: [oops\n---\n\nbody\n",
		);
		const reader = new YamlRoutingConfigReader({ projectRoot: tmp });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});
});
