import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	DebugEventRecord,
	KnownDecision,
	RoutingDecisionReader,
} from "../../../domain/ports/routing-decision-reader.port.js";
import type { RoutingDecision } from "../../../domain/value-objects/routing-decision.js";

export class JsonlRoutingDecisionReader implements RoutingDecisionReader {
	constructor(private readonly path: string) {}

	async readKnownDecisions(): Promise<KnownDecision[]> {
		return this.read((entry: Record<string, unknown>) => {
			if (entry.kind !== "route") return null;
			const decision = entry.decision as Record<string, unknown> | undefined;
			if (!decision?.decision_id) return null;
			const known: KnownDecision = {
				decision_id: decision.decision_id as string,
				slice_id: entry.slice_id as string,
				workflow_id: entry.workflow_id as string,
			};
			if (typeof decision.agent === "string") known.agent = decision.agent;
			if (decision.signals != null) known.signals = decision.signals as KnownDecision["signals"];
			if (typeof decision.fallback_used === "boolean") known.fallback_used = decision.fallback_used;
			if (typeof decision.confidence === "number") known.confidence = decision.confidence;
			return known;
		});
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
