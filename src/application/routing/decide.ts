import { randomUUID } from "node:crypto";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { scoreAgents } from "../../domain/helpers/routing-rubric.js";
import type { RoutingConfigReader } from "../../domain/ports/routing-config-reader.port.js";
import type { RoutingDecisionLogger } from "../../domain/ports/routing-decision-logger.port.js";
import type { ExtractInput, SignalExtractor } from "../../domain/ports/signal-extractor.port.js";
import type { TierConfigReader } from "../../domain/ports/tier-config-reader.port.js";
import { isOk, Ok, type Result } from "../../domain/result.js";
import type { RoutingDecision } from "../../domain/value-objects/routing-decision.js";
import type { Signals } from "../../domain/value-objects/signals.js";
import type { ModelTier } from "../../domain/value-objects/tier-decision.js";
import type { WorkflowPool } from "../../domain/value-objects/workflow-pool.js";
import { extractSignalsUseCase } from "./extract-signals.js";
import { selectTierUseCase } from "./select-tier.js";

export interface DecideInput {
	workflow_id: string;
	slice_id: string;
	extract_input: ExtractInput;
}

export interface DecideDeps {
	configReader: RoutingConfigReader;
	tierConfigReader: TierConfigReader;
	extractor: SignalExtractor;
	logger: RoutingDecisionLogger;
}

export interface AgentDecision {
	agent: string;
	tier: ModelTier;
	policy_tier: ModelTier;
	min_tier_applied: boolean;
	confidence: number;
	fallback_used: boolean;
	route_decision_id: string;
	tier_decision_id: string;
}

export interface DecideOutcome {
	workflow_id: string;
	slice_id: string;
	signals: Signals;
	decisions: AgentDecision[];
}

export const decideUseCase = async (
	input: DecideInput,
	deps: DecideDeps,
): Promise<Result<DecideOutcome, DomainError>> => {
	const extractRes = await extractSignalsUseCase(
		{ workflow_id: input.workflow_id, input: input.extract_input },
		{
			extractor: deps.extractor,
			configReader: deps.configReader,
			logger: deps.logger,
		},
	);
	if (!isOk(extractRes)) return extractRes;
	const { signals, config } = extractRes.data;
	const { confidence_threshold } = config;

	const poolRes = await deps.configReader.readPool(input.workflow_id);
	if (!isOk(poolRes)) return poolRes;
	const pool: WorkflowPool = poolRes.data;

	const decisions: AgentDecision[] = [];
	for (const agent of pool.agents) {
		const subPool: WorkflowPool = {
			workflow_id: pool.workflow_id,
			agents: [agent],
			default_agent: agent.id,
		};
		const ranked = scoreAgents(subPool, signals);
		const top = ranked[0];
		const confidence = top?.match_ratio ?? 0;
		const fallback_used = confidence < confidence_threshold;
		const route_decision_id = randomUUID();
		const routing_decision: RoutingDecision = {
			agent: agent.id,
			confidence,
			signals,
			fallback_used,
			decision_id: route_decision_id,
		};
		const routeLogRes = await deps.logger.append({
			kind: "route",
			timestamp: new Date().toISOString(),
			workflow_id: input.workflow_id,
			slice_id: input.slice_id,
			decision: routing_decision,
		});
		if (!isOk(routeLogRes)) return routeLogRes;

		const tierRes = await selectTierUseCase(
			{
				workflow_id: input.workflow_id,
				slice_id: input.slice_id,
				agent_id: agent.id,
				signals,
			},
			{ tierConfigReader: deps.tierConfigReader, logger: deps.logger },
		);
		if (!isOk(tierRes)) return tierRes;

		decisions.push({
			agent: agent.id,
			tier: tierRes.data.tier,
			policy_tier: tierRes.data.policy_tier,
			min_tier_applied: tierRes.data.min_tier_applied,
			confidence,
			fallback_used,
			route_decision_id,
			tier_decision_id: tierRes.data.decision_id,
		});
	}

	return Ok({
		workflow_id: input.workflow_id,
		slice_id: input.slice_id,
		signals,
		decisions,
	});
};
