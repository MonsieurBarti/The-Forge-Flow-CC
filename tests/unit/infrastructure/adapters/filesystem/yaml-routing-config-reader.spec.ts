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

	it("readPool returns a domain error (not implemented in Phase A)", async () => {
		const reader = new YamlRoutingConfigReader({ projectRoot: dir });
		const res = await reader.readPool("tff:ship");
		expect(isOk(res)).toBe(false);
	});
});
