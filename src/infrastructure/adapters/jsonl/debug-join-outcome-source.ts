import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	OutcomeReadFilter,
	OutcomeSource,
} from "../../../domain/ports/outcome-source.port.js";
import type { RoutingOutcome } from "../../../domain/value-objects/routing-outcome.js";

interface ShipEvent {
	timestamp: string;
	slice_id: string;
	decision_ids: string[];
}

type Clock = () => string;

const OUTCOME_NAMESPACE = "routing-outcome-debug-join:v1";

const deterministicOutcomeId = (decisionId: string, debugTimestamp: string): string => {
	const hash = createHash("sha1");
	hash.update(OUTCOME_NAMESPACE);
	hash.update("|");
	hash.update(decisionId);
	hash.update("|");
	hash.update(debugTimestamp);
	const hex = hash.digest("hex");
	// Format as UUIDv4-shaped string (deterministic but valid uuid shape).
	return (
		`${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-` +
		`8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
	);
};

export class DebugJoinOutcomeSource implements OutcomeSource {
	constructor(
		private readonly routingJsonlPath: string,
		private readonly clock: Clock = () => new Date().toISOString(),
	) {}

	async *readOutcomes(_filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome> {
		try {
			await access(this.routingJsonlPath);
		} catch {
			return;
		}

		// Walk per slice chronologically:
		// - accumulate most recent prior ship's decisions per slice
		// - on each debug event, emit outcomes for accumulated ship (if any), then mark emitted (dedupe)
		const currentShipBySlice = new Map<string, ShipEvent>();
		const emittedShipBySlice = new Map<string, ShipEvent>();

		const rl = createInterface({
			input: createReadStream(this.routingJsonlPath, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		for await (const line of rl) {
			if (!line.trim()) continue;
			let event: unknown;
			try {
				event = JSON.parse(line);
			} catch {
				continue;
			}
			if (
				typeof event !== "object" ||
				event === null ||
				!("kind" in event) ||
				!("slice_id" in event)
			) {
				continue;
			}
			const e = event as {
				kind: string;
				slice_id: string;
				timestamp?: string;
				workflow_id?: string;
				decision?: { decision_id?: string };
			};

			if (e.kind === "route" && e.decision?.decision_id && e.timestamp) {
				const current = currentShipBySlice.get(e.slice_id);
				const isNewShip = !current || current.timestamp !== e.timestamp;
				if (isNewShip) {
					currentShipBySlice.set(e.slice_id, {
						timestamp: e.timestamp,
						slice_id: e.slice_id,
						decision_ids: [e.decision.decision_id],
					});
					emittedShipBySlice.delete(e.slice_id);
				} else {
					current.decision_ids.push(e.decision.decision_id);
				}
			} else if (e.kind === "debug" && e.timestamp) {
				const ship = currentShipBySlice.get(e.slice_id);
				if (!ship) continue;
				const alreadyEmitted = emittedShipBySlice.get(e.slice_id);
				if (alreadyEmitted && alreadyEmitted.timestamp === ship.timestamp) continue;
				emittedShipBySlice.set(e.slice_id, ship);

				for (const decision_id of ship.decision_ids) {
					yield {
						outcome_id: deterministicOutcomeId(decision_id, e.timestamp),
						decision_id,
						dimension: "unknown",
						verdict: "wrong",
						source: "debug-join",
						slice_id: e.slice_id,
						workflow_id: "tff:ship",
						emitted_at: this.clock(),
					};
				}
			}
		}
	}
}
