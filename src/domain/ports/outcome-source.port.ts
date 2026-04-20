import type { OutcomeSourceKind, RoutingOutcome } from "../value-objects/routing-outcome.js";

export interface OutcomeReadFilter {
	since?: string;
	source?: OutcomeSourceKind;
	decision_id?: string;
}

export interface OutcomeSource {
	readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome>;
}
