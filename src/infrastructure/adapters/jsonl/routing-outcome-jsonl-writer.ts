import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { OutcomeWriter } from "../../../domain/ports/outcome-writer.port.js";
import type { RoutingOutcome } from "../../../domain/value-objects/routing-outcome.js";
import { withAppendLock } from "./with-append-lock.js";

export class JsonlRoutingOutcomeWriter implements OutcomeWriter {
	constructor(private readonly path: string) {}

	async append(outcome: RoutingOutcome): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });
		await withAppendLock(this.path, async () => {
			await appendFile(this.path, `${JSON.stringify(outcome)}\n`, "utf8");
		});
	}
}
