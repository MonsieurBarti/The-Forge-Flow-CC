import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TIER_POLICY } from "../../../../../src/domain/ports/tier-config-reader.port.js";
import { isOk } from "../../../../../src/domain/result.js";
import { FilesystemTierConfigReader } from "../../../../../src/infrastructure/adapters/filesystem/filesystem-tier-config-reader.js";

let tmpDir: string;

beforeEach(() => {
	tmpDir = mkdtempSync(join(tmpdir(), "tff-tier-cfg-"));
});
afterEach(() => {
	rmSync(tmpDir, { recursive: true, force: true });
});

describe("FilesystemTierConfigReader.readTierPolicy", () => {
	it("returns defaults when settings.yaml absent", async () => {
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readTierPolicy();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toEqual(DEFAULT_TIER_POLICY);
	});

	it("reads tier_policy block from settings.yaml", async () => {
		const tffDir = join(tmpDir, ".tff-cc");
		mkdirSync(tffDir, { recursive: true });
		writeFileSync(
			join(tffDir, "settings.yaml"),
			`routing:\n  tier_policy:\n    low: haiku\n    medium: opus\n    high: opus\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readTierPolicy();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.medium).toBe("opus");
		expect(res.data.low).toBe("haiku");
	});

	it("returns defaults when routing block absent", async () => {
		const tffDir = join(tmpDir, ".tff-cc");
		mkdirSync(tffDir, { recursive: true });
		writeFileSync(join(tffDir, "settings.yaml"), `other_setting: true\n`);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readTierPolicy();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toEqual(DEFAULT_TIER_POLICY);
	});

	it("falls back per-level defaults for invalid tier values", async () => {
		const tffDir = join(tmpDir, ".tff-cc");
		mkdirSync(tffDir, { recursive: true });
		writeFileSync(
			join(tffDir, "settings.yaml"),
			`routing:\n  tier_policy:\n    low: gpt-4\n    medium: sonnet\n    high: opus\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readTierPolicy();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.low).toBe("haiku"); // invalid "gpt-4" falls back to default
		expect(res.data.medium).toBe("sonnet");
		expect(res.data.high).toBe("opus");
	});
});

describe("FilesystemTierConfigReader.readAgentMinTier", () => {
	it("returns haiku when agent has no min_tier in frontmatter", async () => {
		writeFileSync(
			join(tmpDir, "tff-code-reviewer.md"),
			`---\nname: tff-code-reviewer\nmodel: opus\nrouting:\n  handles: [standard_review]\n  priority: 10\n---\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readAgentMinTier("tff-code-reviewer");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("haiku");
	});

	it("reads min_tier from agent frontmatter", async () => {
		writeFileSync(
			join(tmpDir, "tff-security-auditor.md"),
			`---\nname: tff-security-auditor\nmodel: opus\nrouting:\n  handles: [high_risk]\n  priority: 20\n  min_tier: sonnet\n---\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readAgentMinTier("tff-security-auditor");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("sonnet");
	});

	it("returns haiku when agent file does not exist", async () => {
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readAgentMinTier("unknown-agent");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("haiku");
	});

	it("rejects path traversal agent_id and returns haiku", async () => {
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readAgentMinTier("../../etc/passwd");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("haiku");
	});

	it("falls back to haiku for invalid min_tier value", async () => {
		writeFileSync(
			join(tmpDir, "tff-unknown.md"),
			`---\nname: tff-unknown\nrouting:\n  min_tier: banana\n---\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: tmpDir, agentsDir: tmpDir });
		const res = await reader.readAgentMinTier("tff-unknown");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("haiku");
	});
});

describe("FilesystemTierConfigReader — pluginRoot fallback", () => {
	let project: string;
	let plugin: string;

	beforeEach(() => {
		project = mkdtempSync(join(tmpdir(), "tff-tier-proj-"));
		plugin = mkdtempSync(join(tmpdir(), "tff-tier-plugin-"));
	});
	afterEach(() => {
		rmSync(project, { recursive: true, force: true });
		rmSync(plugin, { recursive: true, force: true });
	});

	it("reads agent min_tier from pluginRoot when project has no agents/", async () => {
		mkdirSync(join(plugin, "agents"), { recursive: true });
		writeFileSync(
			join(plugin, "agents", "tff-security-auditor.md"),
			`---\nrouting:\n  min_tier: sonnet\n---\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: project, pluginRoot: plugin });
		const res = await reader.readAgentMinTier("tff-security-auditor");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("sonnet");
	});

	it("projectRoot agent wins over pluginRoot agent when both define min_tier", async () => {
		mkdirSync(join(project, "agents"), { recursive: true });
		mkdirSync(join(plugin, "agents"), { recursive: true });
		writeFileSync(
			join(project, "agents", "tff-spec-reviewer.md"),
			`---\nrouting:\n  min_tier: opus\n---\n`,
		);
		writeFileSync(
			join(plugin, "agents", "tff-spec-reviewer.md"),
			`---\nrouting:\n  min_tier: haiku\n---\n`,
		);
		const reader = new FilesystemTierConfigReader({ projectRoot: project, pluginRoot: plugin });
		const res = await reader.readAgentMinTier("tff-spec-reviewer");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("opus");
	});

	it("returns haiku default when agent is missing from both roots", async () => {
		const reader = new FilesystemTierConfigReader({ projectRoot: project, pluginRoot: plugin });
		const res = await reader.readAgentMinTier("ghost-agent");
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toBe("haiku");
	});
});
