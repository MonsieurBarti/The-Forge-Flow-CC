import { appendFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlRoutingOutcomeReader } from "../../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";

const validOutcome = {
	outcome_id: "00000000-0000-4000-8000-000000000099",
	decision_id: "00000000-0000-4000-8000-000000000001",
	dimension: "agent" as const,
	verdict: "ok" as const,
	source: "debug-join" as const,
	slice_id: "M01-S01",
	workflow_id: "tff:ship",
	emitted_at: "2026-04-19T09:00:00.000Z",
};

describe("JsonlRoutingOutcomeReader", () => {
	let dir: string;
	let path: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "outcome-reader-"));
		path = join(dir, "outcomes.jsonl");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("returns empty when file does not exist", async () => {
		const reader = new JsonlRoutingOutcomeReader(path);
		const results: unknown[] = [];
		for await (const o of reader.readOutcomes({})) {
			results.push(o);
		}
		expect(results).toHaveLength(0);
	});

	it("yields valid outcomes from file", async () => {
		await appendFile(path, `${JSON.stringify(validOutcome)}\n`, "utf8");
		const reader = new JsonlRoutingOutcomeReader(path);
		const results: unknown[] = [];
		for await (const o of reader.readOutcomes({})) {
			results.push(o);
		}
		expect(results).toHaveLength(1);
	});

	it("skips lines that fail schema validation", async () => {
		await writeFile(
			path,
			`${[
				JSON.stringify(validOutcome),
				JSON.stringify({ wrong: "structure" }),
				JSON.stringify({
					...validOutcome,
					outcome_id: "00000000-0000-4000-8000-000000000002",
					decision_id: "00000000-0000-4000-8000-000000000003",
				}),
			].join("\n")}\n`,
			"utf8",
		);
		const reader = new JsonlRoutingOutcomeReader(path);
		const results: unknown[] = [];
		for await (const o of reader.readOutcomes({})) {
			results.push(o);
		}
		expect(results).toHaveLength(2);
	});

	it("skips blank lines", async () => {
		await writeFile(path, `${JSON.stringify(validOutcome)}\n\n`, "utf8");
		const reader = new JsonlRoutingOutcomeReader(path);
		const results: unknown[] = [];
		for await (const o of reader.readOutcomes({})) {
			results.push(o);
		}
		expect(results).toHaveLength(1);
	});
});
