import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface SliceMergeLookup {
	/**
	 * Find the merge commit on the default branch that landed this slice's work.
	 * `sliceLabel` is the "M##-S##" coordinate. Implementations typically do
	 * `git log --grep=<sliceLabel> --merges --format=%H <default-branch>` and
	 * return the first match.
	 */
	findMergeCommit(sliceLabel: string): Promise<Result<string, DomainError>>;
}
