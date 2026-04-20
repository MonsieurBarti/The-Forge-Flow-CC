import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface SliceSpecResult {
	text: string;
	truncated: boolean;
	missing: boolean;
}

export interface SliceSpecReader {
	/**
	 * Read the slice's SPEC.md, capping the returned text to `maxBytes`.
	 * Missing file → {text: "", truncated: false, missing: true} (no error).
	 */
	readSpec(sliceLabel: string, maxBytes: number): Promise<Result<SliceSpecResult, DomainError>>;
}
