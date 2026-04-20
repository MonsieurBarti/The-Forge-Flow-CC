import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { YamlRoutingConfigReader } from "../../../../../src/infrastructure/adapters/filesystem/yaml-routing-config-reader.js";

const writeSettings = (root: string, body: string) => {
	mkdirSync(join(root, ".tff-cc"), { recursive: true });
	writeFileSync(join(root, ".tff-cc", "settings.yaml"), body, "utf8");
};

describe("YamlRoutingConfigReader — source_weights + model_judge", () => {
	let root: string;
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-phase-e-cfg-"));
	});

	it("parses source_weights map", async () => {
		writeSettings(
			root,
			`routing:
  enabled: true
  calibration:
    n_min: 5
    source_weights:
      manual: 1.0
      debug-join: 0.4
      model-judge: 0.9
`,
		);
		const res = await new YamlRoutingConfigReader({ projectRoot: root }).readConfig();
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.calibration?.source_weights).toEqual({
			manual: 1.0,
			"debug-join": 0.4,
			"model-judge": 0.9,
		});
	});

	it("parses model_judge block with defaults", async () => {
		writeSettings(
			root,
			`routing:
  enabled: true
  calibration:
    model_judge:
      enabled: true
`,
		);
		const res = await new YamlRoutingConfigReader({ projectRoot: root }).readConfig();
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.calibration?.model_judge).toEqual({
			enabled: true,
			model: "claude-haiku-4-5-20251001",
			temperature: 0,
			max_patch_bytes: 32768,
			max_spec_bytes: 16384,
			timeout_ms: 30000,
		});
	});

	it("accepts implicit_weight alone (backcompat)", async () => {
		writeSettings(
			root,
			`routing:
  enabled: true
  calibration:
    implicit_weight: 0.3
`,
		);
		const res = await new YamlRoutingConfigReader({ projectRoot: root }).readConfig();
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.calibration?.implicit_weight).toBe(0.3);
		expect(res.data.calibration?.source_weights).toBeUndefined();
	});

	it("accepts both (caller handles precedence)", async () => {
		writeSettings(
			root,
			`routing:
  enabled: true
  calibration:
    implicit_weight: 0.3
    source_weights:
      manual: 1.0
      debug-join: 0.5
      model-judge: 1.0
`,
		);
		const res = await new YamlRoutingConfigReader({ projectRoot: root }).readConfig();
		if (!isOk(res)) throw new Error("not ok");
		expect(res.data.calibration?.implicit_weight).toBe(0.3);
		expect(res.data.calibration?.source_weights).toBeDefined();
	});
});
