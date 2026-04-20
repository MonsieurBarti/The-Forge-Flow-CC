import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface DiffSummary {
	files_changed: number;
	insertions: number;
	deletions: number;
	patch: string;
	truncated: boolean;
}

export interface DiffReader {
	/** Read the diff introduced by a merge commit, truncating the patch to `maxPatchBytes`. */
	readMergeDiff(mergeSha: string, maxPatchBytes: number): Promise<Result<DiffSummary, DomainError>>;
}
