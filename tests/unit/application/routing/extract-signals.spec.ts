import { describe, expect, it, vi } from "vitest";
import { extractSignalsUseCase } from "../../../../src/application/routing/extract-signals.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../../../src/domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../../../src/domain/ports/routing-decision-logger.port.js";
import type { SignalExtractor } from "../../../../src/domain/ports/signal-extractor.port.js";
import { isOk, Ok } from "../../../../src/domain/result.js";
import type { Signals } from "../../../../src/domain/value-objects/signals.js";

const DETERMINISTIC_SIGNALS: Signals = {
	complexity: "low",
	risk: { level: "low", tags: [] },
};

const CONFIG: RoutingConfig = {
	enabled: true,
	confidence_threshold: 0.5,
	logging: { path: ".tff-cc/logs/routing.jsonl" },
};

const mkDeps = () => {
	const extractor: SignalExtractor = {
		extract: vi.fn().mockResolvedValue(Ok(DETERMINISTIC_SIGNALS)),
	};
	const configReader: RoutingConfigReader = {
		readConfig: vi.fn().mockResolvedValue(Ok(CONFIG)),
		readPool: vi.fn(),
	};
	const logger: RoutingDecisionLogger = {
		append: vi.fn().mockResolvedValue(Ok(undefined)),
	};
	return { extractor, configReader, logger };
};

const INPUT = {
	slice_id: "M01-S01",
	affected_files: ["src/foo.ts"],
	description: "trivial change",
};

describe("extractSignalsUseCase", () => {
	it("returns deterministic signals from the extractor", async () => {
		const deps = mkDeps();
		const res = await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(isOk(res)).toBe(true);
		if (!isOk(res)) return;
		expect(res.data.signals).toEqual(DETERMINISTIC_SIGNALS);
	});

	it("writes one extract log entry with deterministic signals", async () => {
		const deps = mkDeps();
		await extractSignalsUseCase({ workflow_id: "tff:ship", input: INPUT }, deps);
		expect(deps.logger.append).toHaveBeenCalledTimes(1);
		const entry = (deps.logger.append as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
		expect(entry.kind).toBe("extract");
		expect(entry.deterministic_signals).toEqual(DETERMINISTIC_SIGNALS);
	});
});
