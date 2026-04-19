import type { RoutingDecision } from "../value-objects/routing-decision.js";

/**
 * KnownDecision is the minimal projection each CLI needs when looking up
 * whether a decision_id exists and what slice/workflow context it was made in.
 */
export interface KnownDecision {
	decision_id: string;
	slice_id: string;
	workflow_id: string;
}

/**
 * RoutingDecisionReader reads decisions from the append-only routing log.
 * Two projections:
 *  - `readKnownDecisions()` — minimal shape used for decision-id lookups in
 *    the manual outcome CLI (avoids loading full decision payloads).
 *  - `readDecisions()` — full `RoutingDecision` records used by the calibrator
 *    for per-agent / per-tag grouping.
 *
 * Both treat a missing file as an empty stream. Corrupt lines are skipped
 * with a stderr warning.
 */
export interface RoutingDecisionReader {
	readKnownDecisions(): Promise<KnownDecision[]>;
	readDecisions(): Promise<RoutingDecision[]>;
}
