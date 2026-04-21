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

	it("serializes a TierDecisionLogEntry as a JSONL line with kind: 'tier'", async () => {
		const path = join(dir, "routing.jsonl");
		const logger = new JsonlRoutingDecisionLogger(path);
		const decisionId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
		const tierEntry = {
			kind: "tier" as const,
			timestamp: "2026-04-19T11:00:00.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				tier: "sonnet" as const,
				policy_tier: "haiku" as const,
				min_tier_applied: true,
				agent_id: "tff-security-auditor",
				decision_id: decisionId,
				signals: { complexity: "low" as const, risk: { level: "low", tags: [] } },
			},
		};

		const result = await logger.append(tierEntry);
		expect(isOk(result)).toBe(true);

		const content = await readFile(path, "utf8");
		const lines = content.split("\n").filter((l) => l.length > 0);
		expect(lines).toHaveLength(1);

		const parsed = JSON.parse(lines[0] as string);
		expect(parsed.kind).toBe("tier");
		expect(parsed.decision.tier).toBe("sonnet");
		expect(parsed.decision.decision_id).toBe(decisionId);
		expect(parsed.decision.min_tier_applied).toBe(true);
	});

	it("returns ROUTING_CONFIG error when append fails (e.g. path is a directory)", async () => {
		// Use a directory as the path — appendFile to a directory will throw an OS error
		const badPath = dir; // dir itself is a directory
		const logger = new JsonlRoutingDecisionLogger(badPath);
		const result = await logger.append({
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
		expect(isOk(result)).toBe(false);
		if (isOk(result)) throw new Error("expected error");
		expect(result.error.code).toBe("ROUTING_CONFIG");
	});
});
