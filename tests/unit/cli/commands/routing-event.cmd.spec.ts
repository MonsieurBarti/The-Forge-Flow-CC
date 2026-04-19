import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routingEventCmd } from "../../../../src/cli/commands/routing-event.cmd.js";

describe("routing:event CLI", () => {
	let dir: string;
	let origCwd: string;

	beforeEach(async () => {
		origCwd = process.cwd();
		dir = await mkdtemp(join(tmpdir(), "routing-event-cli-"));
		process.chdir(dir);
	});

	afterEach(async () => {
		process.chdir(origCwd);
		await rm(dir, { recursive: true, force: true });
	});

	it("writes a debug event line to routing.jsonl", async () => {
		const { writeFile, mkdir } = await import("node:fs/promises");
		await mkdir(join(dir, ".tff-cc"), { recursive: true });
		await writeFile(
			join(dir, ".tff-cc", "settings.yaml"),
			"routing:\n  enabled: true\n  logging:\n    path: .tff-cc/logs/routing.jsonl\n",
			"utf8",
		);

		const out = await routingEventCmd(["--kind", "debug", "--slice", "M01-S01"]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		const raw = await readFile(join(dir, ".tff-cc/logs/routing.jsonl"), "utf8");
		const entry = JSON.parse(raw.trim().split("\n").pop() ?? "");
		expect(entry.kind).toBe("debug");
		expect(entry.slice_id).toBe("M01-S01");
		expect(entry.workflow_id).toBe("tff:debug");
	});

	it("rejects non-debug kind for v1", async () => {
		const out = await routingEventCmd(["--kind", "route", "--slice", "M01-S01"]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(false);
	});
});
