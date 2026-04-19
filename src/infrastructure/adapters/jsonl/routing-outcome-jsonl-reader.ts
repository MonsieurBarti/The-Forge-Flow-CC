import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	OutcomeReadFilter,
	OutcomeSource,
} from "../../../domain/ports/outcome-source.port.js";
import {
	type RoutingOutcome,
	RoutingOutcomeSchema,
} from "../../../domain/value-objects/routing-outcome.js";

export class JsonlRoutingOutcomeReader implements OutcomeSource {
	constructor(private readonly path: string) {}

	async *readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome> {
		try {
			await access(this.path);
		} catch {
			return;
		}

		const rl = createInterface({
			input: createReadStream(this.path, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		for await (const line of rl) {
			if (!line.trim()) continue;
			let parsed: unknown;
			try {
				parsed = JSON.parse(line);
			} catch (err) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.path}: ${err instanceof Error ? err.message : String(err)}\n`,
				);
				continue;
			}
			const result = RoutingOutcomeSchema.safeParse(parsed);
			if (!result.success) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.path}: ${result.error.issues[0]?.message ?? "schema validation failed"}\n`,
				);
				continue;
			}
			const outcome = result.data;
			if (filter.source && outcome.source !== filter.source) continue;
			if (filter.decision_id && outcome.decision_id !== filter.decision_id) continue;
			if (filter.since && outcome.emitted_at < filter.since) continue;
			yield outcome;
		}
	}
}
