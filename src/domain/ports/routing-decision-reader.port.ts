import type { RoutingDecision } from "../value-objects/routing-decision.js";
import type { ModelTier } from "../value-objects/tier-decision.js";

/**
 * KnownDecision is the minimal projection each CLI needs when looking up
 * whether a decision_id exists and what slice/workflow context it was made in.
 */
export interface KnownDecision {
	decision_id: string;
	slice_id: string;
	workflow_id: string;
	agent?: string;
	signals?: import("../value-objects/signals.js").Signals;
	fallback_used?: boolean;
	confidence?: number;
	tier?: ModelTier; // populated from matching tier event via route+tier join
}

/**
 * DebugEventRecord is the minimal projection used to check for recent debug
 * events when debouncing rapid duplicate writes.
 */
export interface DebugEventRecord {
	timestamp: string;
	slice_id: string;
	workflow_id: string;
}

/**
 * RoutingDecisionReader reads decisions from the append-only routing log.
 * Three projections:
 *  - `readKnownDecisions()` — minimal shape used for decision-id lookups in
 *    the manual outcome CLI (avoids loading full decision payloads).
 *  - `readDecisions()` — full `RoutingDecision` records used by the calibrator
 *    for per-agent / per-tag grouping.
 *  - `readDebugEvents()` — minimal shape used to debounce duplicate debug events.
 *
 * All treat a missing file as an empty stream. Corrupt lines are skipped
 * with a stderr warning.
 */
export interface RoutingDecisionReader {
	readKnownDecisions(): Promise<KnownDecision[]>;
	readDecisions(): Promise<RoutingDecision[]>;
	readDebugEvents(): Promise<DebugEventRecord[]>;
}
