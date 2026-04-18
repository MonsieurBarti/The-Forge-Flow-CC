import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { JsonlRoutingDecisionLogger } from "../../../../../src/infrastructure/adapters/jsonl/jsonl-routing-decision-logger.js";

describe("JsonlRoutingDecisionLogger", () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "routing-log-"));
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("appends one JSON line per entry", async () => {
		const path = join(dir, "routing.jsonl");
		const logger = new JsonlRoutingDecisionLogger(path);
		const base = {
			timestamp: "2026-04-18T12:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
		};
		const r1 = await logger.append({
			kind: "extract",
			...base,
			deterministic_signals: {
				complexity: "low",
				risk: { level: "low", tags: [] },
			},
			duration_ms: 12,
		});
		expect(isOk(r1)).toBe(true);
		const r2 = await logger.append({
			kind: "extract",
			...base,
			slice_id: "M01-S02",
			deterministic_signals: {
				complexity: "high",
				risk: { level: "high", tags: ["auth"] },
			},
			duration_ms: 30,
		});
		expect(isOk(r2)).toBe(true);

		const lines = (await readFile(path, "utf8")).split("\n").filter((l) => l.length > 0);
		expect(lines).toHaveLength(2);
		const first = JSON.parse(lines[0] as string);
		expect(first.kind).toBe("extract");
		expect(first.slice_id).toBe("M01-S01");
	});

	it("creates parent directory if missing", async () => {
		const path = join(dir, "nested/deep/routing.jsonl");
		const logger = new JsonlRoutingDecisionLogger(path);
		const res = await logger.append({
			kind: "extract",
			timestamp: "t",
			workflow_id: "w",
			slice_id: "s",
			deterministic_signals: {
				complexity: "low",
				risk: { level: "low", tags: [] },
			},
			duration_ms: 0,
		});
		expect(isOk(res)).toBe(true);
	});
});
