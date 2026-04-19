import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routingOutcomeCmd } from "../../src/cli/commands/routing-outcome.cmd.js";

describe("routing:outcome CLI integration", () => {
	let dir: string;
	let origCwd: string;

	beforeEach(async () => {
		origCwd = process.cwd();
		dir = await mkdtemp(join(tmpdir(), "routing-outcome-"));
		process.chdir(dir);

		await mkdir(join(dir, ".tff-cc"), { recursive: true });
		await writeFile(
			join(dir, ".tff-cc", "settings.yaml"),
			"routing:\n  enabled: true\n  logging:\n    path: .tff-cc/logs/routing.jsonl\n",
			"utf8",
		);
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
	});

	afterEach(async () => {
		process.chdir(origCwd);
		await rm(dir, { recursive: true, force: true });
	});

	it("records a manual tier/too-low outcome", async () => {
		const out = await routingOutcomeCmd([
			"--decision",
			"00000000-0000-4000-8000-000000000001",
			"--dimension",
			"tier",
			"--verdict",
			"too-low",
			"--reason",
			"needed opus",
		]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);

		const raw = await readFile(join(dir, ".tff-cc/logs/routing-outcomes.jsonl"), "utf8");
		const entry = JSON.parse(raw.trim());
		expect(entry.dimension).toBe("tier");
		expect(entry.verdict).toBe("too-low");
		expect(entry.source).toBe("manual");
		expect(entry.reason).toBe("needed opus");
	});

	it("rejects unknown decision_id with PRECONDITION_VIOLATION", async () => {
		const out = await routingOutcomeCmd([
			"--decision",
			"00000000-0000-4000-8000-00000000ffff",
			"--dimension",
			"agent",
			"--verdict",
			"wrong",
		]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("rejects invalid dimension × verdict combo", async () => {
		const out = await routingOutcomeCmd([
			"--decision",
			"00000000-0000-4000-8000-000000000001",
			"--dimension",
			"agent",
			"--verdict",
			"too-low",
		]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
	});
});
