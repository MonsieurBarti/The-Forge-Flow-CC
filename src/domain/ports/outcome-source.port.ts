import type { RoutingOutcome } from "../value-objects/routing-outcome.js";

export interface OutcomeReadFilter {
	since?: string;
	source?: "debug-join" | "manual";
	decision_id?: string;
}

export interface OutcomeSource {
	readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome>;
}
