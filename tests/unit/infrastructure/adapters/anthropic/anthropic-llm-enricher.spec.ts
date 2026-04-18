import { describe, expect, it, vi } from "vitest";
import { isOk } from "../../../../../src/domain/result.js";
import { AnthropicLlmEnricher } from "../../../../../src/infrastructure/adapters/anthropic/anthropic-llm-enricher.js";

const INPUT = {
	slice_id: "S1",
	affected_files: [] as string[],
	description: "make things safer",
};
const BASE = {
	complexity: "low" as const,
	risk: { level: "low" as const, tags: [] as string[] },
};

describe("AnthropicLlmEnricher", () => {
	it("returns enriched signals when the LLM responds with valid JSON", async () => {
		const client = {
			complete: vi
				.fn()
				.mockResolvedValue(
					JSON.stringify({
						complexity: "high",
						risk: { level: "high", tags: ["auth"] },
					}),
				),
		};
		const enricher = new AnthropicLlmEnricher({
			client,
			model: "test",
			timeout_ms: 1000,
		});
		const res = await enricher.enrich(BASE, INPUT);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.risk.tags).toEqual(["auth"]);
	});

	it("returns input signals unchanged when LLM returns non-JSON", async () => {
		const client = { complete: vi.fn().mockResolvedValue("not-json") };
		const enricher = new AnthropicLlmEnricher({
			client,
			model: "test",
			timeout_ms: 1000,
		});
		const res = await enricher.enrich(BASE, INPUT);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toEqual(BASE);
	});

	it("returns input signals when LLM returns schema-invalid JSON", async () => {
		const client = {
			complete: vi
				.fn()
				.mockResolvedValue(
					JSON.stringify({ complexity: "extreme", risk: "bad-shape" }),
				),
		};
		const enricher = new AnthropicLlmEnricher({
			client,
			model: "test",
			timeout_ms: 1000,
		});
		const res = await enricher.enrich(BASE, INPUT);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toEqual(BASE);
	});

	it("returns input signals when client rejects (timeout/error)", async () => {
		const client = {
			complete: vi.fn().mockRejectedValue(new Error("timeout")),
		};
		const enricher = new AnthropicLlmEnricher({
			client,
			model: "test",
			timeout_ms: 1000,
		});
		const res = await enricher.enrich(BASE, INPUT);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data).toEqual(BASE);
	});
});
