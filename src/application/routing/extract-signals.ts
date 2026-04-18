import type { DomainError } from "../../domain/errors/domain-error.js";
import type { LlmEnricher } from "../../domain/ports/llm-enricher.port.js";
import type { RoutingConfigReader } from "../../domain/ports/routing-config-reader.port.js";
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
	enricher: LlmEnricher;
	configReader: RoutingConfigReader;
	logger: RoutingDecisionLogger;
}

export interface ExtractSignalsOutcome {
	signals: Signals;
	enriched: boolean;
}

/**
 * Heuristic: deterministic signals are "low confidence" when all three of
 * complexity, risk.level are "low" AND risk.tags is empty — i.e., the
 * deterministic path found nothing distinctive.
 */
const isLowConfidence = (s: Signals): boolean =>
	s.complexity === "low" && s.risk.level === "low" && s.risk.tags.length === 0;

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
	const deterministic = extractRes.data;

	let finalSignals: Signals = deterministic;
	let enriched = false;
	let enrichmentError: string | undefined;

	const shouldEnrich = config.llm_enrichment.enabled && isLowConfidence(deterministic);

	if (shouldEnrich) {
		try {
			const enrichRes = await deps.enricher.enrich(deterministic, input.input);
			if (isOk(enrichRes)) {
				finalSignals = enrichRes.data;
				enriched = true;
			} else {
				enrichmentError = JSON.stringify(enrichRes.error);
			}
		} catch (err) {
			enrichmentError = err instanceof Error ? err.message : String(err);
			process.stderr.write(
				`routing: LLM enrichment failed (${enrichmentError}) — using deterministic signals only.\n`,
			);
		}
	}

	await deps.logger.append({
		kind: "extract",
		timestamp: new Date().toISOString(),
		workflow_id: input.workflow_id,
		slice_id: input.input.slice_id,
		deterministic_signals: deterministic,
		enriched_signals: enriched ? finalSignals : undefined,
		enrichment_error: enrichmentError,
		duration_ms: Date.now() - started,
	});

	return Ok({ signals: finalSignals, enriched });
};
