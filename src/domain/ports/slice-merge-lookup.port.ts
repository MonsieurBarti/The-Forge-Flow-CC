import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface SliceMergeLookup {
	/**
	 * Find the commit that landed this slice's work, searching the supplied
	 * branches in order and returning the first hit. `sliceLabel` is the
	 * "M##-S##" coordinate; implementations grep commit subjects on each branch
	 * for that label as a standalone token. `--merges` is NOT recommended:
	 * squash-merges produce regular commits (not merge commits) with the label
	 * in the subject line, and filtering to `--merges` would miss them.
	 */
	findMergeCommit(sliceLabel: string, branches: string[]): Promise<Result<string, DomainError>>;
}
