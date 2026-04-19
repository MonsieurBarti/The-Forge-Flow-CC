import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routingCalibrateCmd } from "../../src/cli/commands/routing-calibrate.cmd.js";

describe("routing:calibrate CLI integration", () => {
	let dir: string;
	let origCwd: string;

	beforeEach(async () => {
		origCwd = process.cwd();
		dir = await mkdtemp(join(tmpdir(), "routing-calibrate-"));
		process.chdir(dir);

		await mkdir(join(dir, ".tff-cc"), { recursive: true });
		await writeFile(
			join(dir, ".tff-cc", "settings.yaml"),
			"routing:\n  enabled: true\n  logging:\n    path: .tff-cc/logs/routing.jsonl\n",
			"utf8",
		);
	});

	afterEach(async () => {
		process.chdir(origCwd);
		await rm(dir, { recursive: true, force: true });
	});

	it("produces an empty report when no logs exist", async () => {
		const out = await routingCalibrateCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		const reportPath = parsed.data.report_path;
		const md = await readFile(reportPath, "utf8");
		expect(md).toContain("# Routing Calibration Report");
		expect(md).toContain("No cells evaluated");
	});

	it("is deterministic: same logs produce byte-identical reports", async () => {
		const routingPath = join(dir, ".tff-cc/logs/routing.jsonl");
		await mkdir(dirname(routingPath), { recursive: true });
		await appendFile(
			routingPath,
			`${JSON.stringify({
				kind: "route",
				timestamp: "2026-04-19T09:00:00.000Z",
				workflow_id: "tff:ship",
				slice_id: "M01-S01",
				decision: {
					agent: "tff-code-reviewer",
					confidence: 0.9,
					signals: { complexity: "low", risk: { level: "low", tags: ["auth"] } },
					fallback_used: false,
					enriched: false,
					decision_id: "00000000-0000-4000-8000-000000000001",
				},
			})}\n`,
			"utf8",
		);

		await routingCalibrateCmd([]);
		const md1 = await readFile(join(dir, ".tff-cc/logs/routing-calibration.md"), "utf8");
		await routingCalibrateCmd([]);
		const md2 = await readFile(join(dir, ".tff-cc/logs/routing-calibration.md"), "utf8");
		const strip = (s: string) => s.replace(/^Generated at:.*$/m, "Generated at: <STABLE>");
		expect(strip(md1)).toEqual(strip(md2));
	});
});
