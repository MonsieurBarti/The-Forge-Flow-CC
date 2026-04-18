import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { RoutingDecision } from "../value-objects/routing-decision.js";
import type { Signals } from "../value-objects/signals.js";

export interface SignalExtractionLogEntry {
	kind: "extract";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
	deterministic_signals: Signals;
	enriched_signals?: Signals;
	enrichment_error?: string;
	duration_ms: number;
}

export interface RoutingDecisionLogEntry {
	kind: "route";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
	decision: RoutingDecision;
}

export type RoutingLogEntry = SignalExtractionLogEntry | RoutingDecisionLogEntry;

export interface RoutingDecisionLogger {
	append(entry: RoutingLogEntry): Promise<Result<void, DomainError>>;
}
