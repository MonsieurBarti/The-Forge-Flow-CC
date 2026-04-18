import type { DomainError } from "../../domain/errors/domain-error.js";
import { scoreAgents, signalsToTagSet } from "../../domain/helpers/routing-rubric.js";
import type { RoutingConfigReader } from "../../domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../domain/ports/routing-decision-logger.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";
import type { RoutingDecision } from "../../domain/value-objects/routing-decision.js";
import type { Signals } from "../../domain/value-objects/signals.js";

interface RouteInput {
	workflow_id: string;
	signals: Signals;
	slice_id: string;
}

interface RouteDeps {
	configReader: RoutingConfigReader;
	logger: RoutingDecisionLogger;
}

export const routeUseCase = async (
	input: RouteInput,
	deps: RouteDeps,
): Promise<Result<RoutingDecision, DomainError>> => {
	const configRes = await deps.configReader.readConfig();
	if (!isOk(configRes)) return configRes;
	const config = configRes.data;

	const poolRes = await deps.configReader.readPool(input.workflow_id);
	if (!isOk(poolRes)) return poolRes;
	const pool = poolRes.data;

	const ranked = scoreAgents(pool, input.signals);
	const top = ranked[0];

	// Confidence: fraction of top agent's handles covered by the signal tag set.
	// Uses agent-handles as denominator so a specialist whose every skill matches
	// reports confidence = 1, independent of how many other signal tags exist.
	const signalTags = signalsToTagSet(input.signals);
	const topConfidence = top
		? (() => {
				if (top.agent.handles.length === 0) return 0;
				const matched = top.agent.handles.filter((h) => signalTags.has(h)).length;
				return matched / top.agent.handles.length;
			})()
		: 0;

	let agent: string;
	let confidence: number;
	let fallback_used: boolean;

	if (top && topConfidence >= config.confidence_threshold) {
		agent = top.agent.id;
		confidence = topConfidence;
		fallback_used = false;
	} else {
		agent = pool.default_agent;
		confidence = topConfidence;
		fallback_used = true;
	}

	const decision: RoutingDecision = {
		agent,
		confidence,
		signals: input.signals,
		fallback_used,
		enriched: false, // Phase A: set by caller if upstream enrichment occurred
	};

	await deps.logger.append({
		kind: "route",
		timestamp: new Date().toISOString(),
		workflow_id: input.workflow_id,
		slice_id: input.slice_id,
		decision,
	});

	return Ok(decision);
};
