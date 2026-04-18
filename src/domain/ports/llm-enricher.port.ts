import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { Signals } from "../value-objects/signals.js";
import type { ExtractInput } from "./signal-extractor.port.js";

export interface LlmEnricher {
	enrich(signals: Signals, input: ExtractInput): Promise<Result<Signals, DomainError>>;
}
