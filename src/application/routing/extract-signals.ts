import type { DomainError } from "../../domain/errors/domain-error.js";
import type {
	RoutingConfig,
	RoutingConfigReader,
} from "../../domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../domain/ports/routing-decision-logger.port.js";
import type { ExtractInput, SignalExtractor } from "../../domain/ports/signal-extractor.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";
import type { Signals } from "../../domain/value-objects/signals.js";

interface ExtractSignalsInput {
	workflow_id: string;
	input: ExtractInput;
}

interface ExtractSignalsDeps {
	extractor: SignalExtractor;
	configReader: RoutingConfigReader;
	logger: RoutingDecisionLogger;
}

export interface ExtractSignalsOutcome {
	signals: Signals;
	config: RoutingConfig;
}

export const extractSignalsUseCase = async (
	input: ExtractSignalsInput,
	deps: ExtractSignalsDeps,
): Promise<Result<ExtractSignalsOutcome, DomainError>> => {
	const started = Date.now();

	const configRes = await deps.configReader.readConfig();
	if (!isOk(configRes)) return configRes;
	const config = configRes.data;

	const extractRes = await deps.extractor.extract(input.input);
	if (!isOk(extractRes)) return extractRes;
	const signals = extractRes.data;

	await deps.logger.append({
		kind: "extract",
		timestamp: new Date().toISOString(),
		workflow_id: input.workflow_id,
		slice_id: input.input.slice_id,
		deterministic_signals: signals,
		duration_ms: Date.now() - started,
	});

	return Ok({ signals, config });
};
