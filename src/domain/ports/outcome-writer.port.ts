import type { RoutingOutcome } from "../value-objects/routing-outcome.js";

export interface OutcomeWriter {
	append(outcome: RoutingOutcome): Promise<void>;
}
