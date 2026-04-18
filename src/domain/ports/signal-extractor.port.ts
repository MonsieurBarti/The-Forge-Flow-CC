import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";
import type { Signals } from "../value-objects/signals.js";

export interface ExtractInput {
	slice_id: string;
	spec_path?: string;
	affected_files: string[];
	description: string;
}

export interface SignalExtractor {
	extract(input: ExtractInput): Promise<Result<Signals, DomainError>>;
}
