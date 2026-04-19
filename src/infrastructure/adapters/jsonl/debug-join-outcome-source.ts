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
	workflow_id: string;
	decision_ids: string[];
}

type Clock = () => string;

const NAMESPACE_UUID = "c8a7d91c-7f50-4a7f-9b4e-6b6b0c2a7f42";

const parseUuidToBytes = (uuid: string): Buffer => {
	const hex = uuid.replace(/-/g, "");
	return Buffer.from(hex, "hex");
};

const formatBytesAsUuid = (bytes: Buffer): string => {
	const hex = bytes.toString("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const uuidV5 = (name: string, namespaceUuid: string): string => {
	const nsBytes = parseUuidToBytes(namespaceUuid);
	const nameBytes = Buffer.from(name, "utf8");
	const hash = createHash("sha1");
	hash.update(nsBytes);
	hash.update(nameBytes);
	const bytes = hash.digest().subarray(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
	return formatBytesAsUuid(bytes);
};

const deterministicOutcomeId = (decisionId: string, debugTimestamp: string): string =>
	uuidV5(`${decisionId}|${debugTimestamp}`, NAMESPACE_UUID);

export class DebugJoinOutcomeSource implements OutcomeSource {
	constructor(
		private readonly routingJsonlPath: string,
		private readonly clock: Clock = () => new Date().toISOString(),
	) {}

	async *readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome> {
		if (filter.source && filter.source !== "debug-join") return;
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
			} catch (err) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.routingJsonlPath}: ${err instanceof Error ? err.message : String(err)}\n`,
				);
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
						workflow_id: e.workflow_id ?? "tff:ship",
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
					if (filter.decision_id && decision_id !== filter.decision_id) continue;
					const emitted_at = this.clock();
					if (filter.since && emitted_at < filter.since) continue;
					yield {
						outcome_id: deterministicOutcomeId(decision_id, e.timestamp),
						decision_id,
						dimension: "unknown",
						verdict: "wrong",
						source: "debug-join",
						slice_id: e.slice_id,
						workflow_id: ship.workflow_id,
						emitted_at,
					};
				}
			}
		}
	}
}
