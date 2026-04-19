import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routingCalibrateCmd } from "../../src/cli/commands/routing-calibrate.cmd.js";
import { routingEventCmd } from "../../src/cli/commands/routing-event.cmd.js";
import { routingOutcomeCmd } from "../../src/cli/commands/routing-outcome.cmd.js";

describe("Phase D end-to-end", () => {
	let dir: string;
	let origCwd: string;

	beforeEach(async () => {
		origCwd = process.cwd();
		dir = await mkdtemp(join(tmpdir(), "phase-d-e2e-"));
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

	it("ship decision -> debug event -> calibrate produces a report with implicit outcome", async () => {
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
					signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
					fallback_used: false,
					enriched: false,
					decision_id: "00000000-0000-4000-8000-000000000001",
				},
			})}\n`,
			"utf8",
		);

		// Simulate /tff:debug calling routing:event
		await routingEventCmd(["--kind", "debug", "--slice", "M01-S01"]);

		// Manual label
		await routingOutcomeCmd([
			"--decision",
			"00000000-0000-4000-8000-000000000001",
			"--dimension",
			"tier",
			"--verdict",
			"too-low",
		]);

		// Calibrate
		const out = await routingCalibrateCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);

		const outcomesRaw = await readFile(join(dir, ".tff-cc/logs/routing-outcomes.jsonl"), "utf8");
		const sources = outcomesRaw
			.trim()
			.split("\n")
			.map((l) => JSON.parse(l).source);
		expect(sources).toContain("manual");
		expect(sources).toContain("debug-join");

		const md = await readFile(join(dir, ".tff-cc/logs/routing-calibration.md"), "utf8");
		expect(md).toContain("# Routing Calibration Report");
	});
});
