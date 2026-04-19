import { randomUUID } from "node:crypto";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { scoreAgents } from "../../domain/helpers/routing-rubric.js";
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

	let agent: string;
	let confidence: number;
	let fallback_used: boolean;

	if (top && top.match_ratio >= config.confidence_threshold) {
		agent = top.agent.id;
		confidence = top.match_ratio;
		fallback_used = false;
	} else {
		agent = pool.default_agent;
		confidence = top?.match_ratio ?? 0;
		fallback_used = true;
	}

	const decision: RoutingDecision = {
		agent,
		confidence,
		signals: input.signals,
		fallback_used,
		enriched: false, // Phase A: set by caller if upstream enrichment occurred
		decision_id: randomUUID(),
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
