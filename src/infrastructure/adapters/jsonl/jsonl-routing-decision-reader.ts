import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	DebugEventRecord,
	KnownDecision,
	RoutingDecisionReader,
} from "../../../domain/ports/routing-decision-reader.port.js";
import type { RoutingDecision } from "../../../domain/value-objects/routing-decision.js";
import type { ModelTier } from "../../../domain/value-objects/tier-decision.js";

export class JsonlRoutingDecisionReader implements RoutingDecisionReader {
	constructor(private readonly path: string) {}

	async readKnownDecisions(): Promise<KnownDecision[]> {
		// Single in-memory pass: load all entries, then join route+tier.
		const all = await this.readAll();

		// Pass 1: build tier index keyed by "${slice_id}:${agent_id}" (last-wins).
		const tierIndex = new Map<string, ModelTier>();
		for (const entry of all) {
			if (entry.kind !== "tier") continue;
			const decision = entry.decision as Record<string, unknown> | undefined;
			const agent_id = typeof decision?.agent_id === "string" ? decision.agent_id : undefined;
			const tier = decision?.tier as ModelTier | undefined;
			const slice_id = typeof entry.slice_id === "string" ? entry.slice_id : undefined;
			if (agent_id && tier && slice_id) {
				tierIndex.set(`${slice_id}:${agent_id}`, tier);
			}
		}

		// Pass 2: project route entries, attaching tier from the index.
		const known: KnownDecision[] = [];
		for (const entry of all) {
			if (entry.kind !== "route") continue;
			const decision = entry.decision as Record<string, unknown> | undefined;
			if (!decision?.decision_id) continue;
			const slice_id = entry.slice_id as string;
			const agent = typeof decision.agent === "string" ? decision.agent : undefined;
			const tier = agent ? tierIndex.get(`${slice_id}:${agent}`) : undefined;
			const result: KnownDecision = {
				decision_id: decision.decision_id as string,
				slice_id,
				workflow_id: entry.workflow_id as string,
			};
			if (agent) result.agent = agent;
			if (decision.signals != null) result.signals = decision.signals as KnownDecision["signals"];
			if (typeof decision.fallback_used === "boolean")
				result.fallback_used = decision.fallback_used;
			if (typeof decision.confidence === "number") result.confidence = decision.confidence;
			if (tier) result.tier = tier;
			known.push(result);
		}
		return known;
	}

	async readDecisions(): Promise<RoutingDecision[]> {
		return this.read((entry: Record<string, unknown>) => {
			if (entry.kind !== "route" || !entry.decision) return null;
			return entry.decision as RoutingDecision;
		});
	}

	async readDebugEvents(): Promise<DebugEventRecord[]> {
		return this.read((entry) => {
			if (entry.kind !== "debug") return null;
			return {
				timestamp: entry.timestamp as string,
				slice_id: entry.slice_id as string,
				workflow_id: entry.workflow_id as string,
			};
		});
	}

	private async readAll(): Promise<Record<string, unknown>[]> {
		return this.read((entry) => entry);
	}

	private async read<T>(project: (entry: Record<string, unknown>) => T | null): Promise<T[]> {
		try {
			await access(this.path);
		} catch {
			return [];
		}
		const out: T[] = [];
		const rl = createInterface({
			input: createReadStream(this.path, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});
		for await (const line of rl) {
			if (!line.trim()) continue;
			try {
				const entry = JSON.parse(line) as Record<string, unknown>;
				const projected = project(entry);
				if (projected !== null) out.push(projected);
			} catch (err) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.path}: ${err instanceof Error ? err.message : String(err)}\n`,
				);
			}
		}
		return out;
	}
}
