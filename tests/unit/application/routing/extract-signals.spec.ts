import { describe, expect, it, vi } from "vitest";
import { extractSignalsUseCase } from "../../../../src/application/routing/extract-signals.js";
import type { LlmEnricher } from "../../../../src/domain/ports/llm-enricher.port.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../../../src/domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../../../src/domain/ports/routing-decision-logger.port.js";
import type { SignalExtractor } from "../../../../src/domain/ports/signal-extractor.port.js";
import { isOk, Ok } from "../../../../src/domain/result.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";

const LOW_CONF_SIGNALS: Signals = {
	complexity: "low",
	risk: { level: "low", tags: [] },
};
const RICHER_SIGNALS: Signals = {
	complexity: "high",
	risk: { level: "high", tags: ["auth"] },
};

const mkConfig = (overrides: Partial<RoutingConfig> = {}): RoutingConfig => ({
	enabled: true,
	llm_enrichment: {
		enabled: true,
		model: "claude-haiku-4-5-20251001",
		timeout_ms: 5000,
	},
	confidence_threshold: 0.5,
	logging: { path: ".tff-cc/logs/routing.jsonl" },
	...overrides,
});

const mkDeps = (overrides: {
	extract?: SignalExtractor["extract"];
	enrich?: LlmEnricher["enrich"];
	config?: RoutingConfig;
	logAppend?: RoutingDecisionLogger["append"];
}) => {
	const extractor: SignalExtractor = {
		extract: overrides.extract ?? vi.fn().mockResolvedValue(Ok(LOW_CONF_SIGNALS)),
	};
	const enricher: LlmEnricher = {
		enrich: overrides.enrich ?? vi.fn().mockResolvedValue(Ok(RICHER_SIGNALS)),
	};
	const configReader: RoutingConfigReader = {
		readConfig: vi.fn().mockResolvedValue(Ok(overrides.config ?? mkConfig())),
		readPool: vi.fn(),
	};
	const logger: RoutingDecisionLogger = {
		append: overrides.logAppend ?? vi.fn().mockResolvedValue(Ok(undefined)),
	};
	return { extractor, enricher, configReader, logger };
};

const INPUT = {
	slice_id: "M01-S01",
	affected_files: ["src/foo.ts"],
	description: "trivial change",
};

describe("extractSignalsUseCase", () => {
	it("returns deterministic signals without calling enricher when deterministic signals are NOT low-confidence", async () => {
		const HIGH_CONF: Signals = {
			complexity: "high",
			risk: { level: "high", tags: ["auth", "migrations"] },
		};
		const deps = mkDeps({
			extract: vi.fn().mockResolvedValue(Ok(HIGH_CONF)),
		});
		const res = await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.enriched).toBe(false);
		expect(deps.enricher.enrich).not.toHaveBeenCalled();
	});

	it("invokes enricher when deterministic signals are low-confidence (all 'low', no tags)", async () => {
		const deps = mkDeps({});
		const res = await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(deps.enricher.enrich).toHaveBeenCalledTimes(1);
		expect(res.data.signals).toEqual(RICHER_SIGNALS);
		expect(res.data.enriched).toBe(true);
	});

	it("skips enricher when llm_enrichment.enabled = false", async () => {
		const deps = mkDeps({
			config: mkConfig({
				llm_enrichment: {
					enabled: false,
					model: "",
					timeout_ms: 0,
				},
			}),
		});
		const res = await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(deps.enricher.enrich).not.toHaveBeenCalled();
		expect(res.data.enriched).toBe(false);
		expect(res.data.signals).toEqual(LOW_CONF_SIGNALS);
	});

	it("falls back to deterministic signals if enricher throws", async () => {
		const enrich = vi.fn().mockRejectedValue(new Error("network down"));
		const deps = mkDeps({ enrich });
		const res = await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.enriched).toBe(false);
		expect(res.data.signals).toEqual(LOW_CONF_SIGNALS);
	});

	it("writes one extract log entry with deterministic + enriched signals", async () => {
		const deps = mkDeps({});
		await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(deps.logger.append).toHaveBeenCalledTimes(1);
		const entry = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
		expect(entry.kind).toBe("extract");
		expect(entry.deterministic_signals).toEqual(LOW_CONF_SIGNALS);
		expect(entry.enriched_signals).toEqual(RICHER_SIGNALS);
	});
});
