import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlRoutingDecisionReader } from "../../../../../src/infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js";

const routeLine = {
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
};

describe("JsonlRoutingDecisionReader", () => {
	let dir: string;
	let path: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "jsonl-rdr-"));
		path = join(dir, "routing.jsonl");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("readKnownDecisions projects {decision_id, slice_id, workflow_id} and optional fields from route entries", async () => {
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		const reader = new JsonlRoutingDecisionReader(path);
		const known = await reader.readKnownDecisions();
		expect(known).toHaveLength(1);
		expect(known[0]).toMatchObject({
			decision_id: "00000000-0000-4000-8000-000000000001",
			slice_id: "M01-S01",
			workflow_id: "tff:ship",
		});
		expect(known[0].agent).toBe("tff-code-reviewer");
		expect(known[0].confidence).toBe(0.9);
		expect(known[0].fallback_used).toBe(false);
		expect(known[0].signals).toEqual({
			complexity: "medium",
			risk: { level: "low", tags: ["auth"] },
		});
	});

	it("readDecisions returns full RoutingDecision payloads", async () => {
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		const reader = new JsonlRoutingDecisionReader(path);
		const decisions = await reader.readDecisions();
		expect(decisions).toHaveLength(1);
		expect(decisions[0].agent).toBe("tff-code-reviewer");
		expect(decisions[0].signals.risk.tags).toEqual(["auth"]);
	});

	it("ignores non-route events (extract, tier, debug)", async () => {
		await appendFile(
			path,
			`${JSON.stringify({ kind: "extract", timestamp: "2026-04-19T08:00:00.000Z", workflow_id: "tff:ship", slice_id: "M01-S01", deterministic_signals: { complexity: "low", risk: { level: "low", tags: [] } }, duration_ms: 1 })}\n`,
			"utf8",
		);
		await appendFile(
			path,
			`${JSON.stringify({ kind: "debug", timestamp: "2026-04-19T10:00:00.000Z", workflow_id: "tff:debug", slice_id: "M01-S01" })}\n`,
			"utf8",
		);
		const reader = new JsonlRoutingDecisionReader(path);
		expect(await reader.readKnownDecisions()).toEqual([]);
		expect(await reader.readDecisions()).toEqual([]);
	});

	it("treats missing file as empty", async () => {
		const reader = new JsonlRoutingDecisionReader(join(dir, "absent.jsonl"));
		expect(await reader.readKnownDecisions()).toEqual([]);
		expect(await reader.readDecisions()).toEqual([]);
	});

	it("readDebugEvents returns debug entries and ignores route events", async () => {
		const debugLine = {
			kind: "debug",
			timestamp: "2026-04-19T10:00:00.000Z",
			workflow_id: "tff:debug",
			slice_id: "M01-S01",
		};
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		await appendFile(path, `${JSON.stringify(debugLine)}\n`, "utf8");
		const reader = new JsonlRoutingDecisionReader(path);
		const events = await reader.readDebugEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toEqual({
			timestamp: "2026-04-19T10:00:00.000Z",
			slice_id: "M01-S01",
			workflow_id: "tff:debug",
		});
	});

	it("populates tier from matching tier event when joining route+tier", async () => {
		const tierLine = {
			kind: "tier",
			timestamp: "2026-04-19T09:00:01.000Z",
			workflow_id: "tff:ship",
			slice_id: "M01-S01",
			decision: {
				decision_id: "00000000-0000-4000-8000-000000000002",
				agent_id: "tff-code-reviewer",
				tier: "opus",
				policy_tier: "opus",
				min_tier_applied: false,
				signals: { complexity: "medium", risk: { level: "low", tags: ["auth"] } },
			},
		};
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		await appendFile(path, `${JSON.stringify(tierLine)}\n`, "utf8");
		const reader = new JsonlRoutingDecisionReader(path);
		const known = await reader.readKnownDecisions();
		expect(known).toHaveLength(1);
		expect(known[0].tier).toBe("opus");
	});

	it("leaves tier undefined when no matching tier event exists", async () => {
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		const reader = new JsonlRoutingDecisionReader(path);
		const known = await reader.readKnownDecisions();
		expect(known).toHaveLength(1);
		expect(known[0].tier).toBeUndefined();
	});

	it("skips corrupt lines silently in-memory (logs to stderr)", async () => {
		await appendFile(path, `${JSON.stringify(routeLine)}\n`, "utf8");
		await appendFile(path, "not-json\n", "utf8");
		await appendFile(
			path,
			`${JSON.stringify({ ...routeLine, decision: { ...routeLine.decision, decision_id: "00000000-0000-4000-8000-000000000002" } })}\n`,
			"utf8",
		);
		const reader = new JsonlRoutingDecisionReader(path);
		const known = await reader.readKnownDecisions();
		expect(known.map((d) => d.decision_id)).toEqual([
			"00000000-0000-4000-8000-000000000001",
			"00000000-0000-4000-8000-000000000002",
		]);
	});
});
