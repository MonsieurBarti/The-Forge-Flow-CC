import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface SliceMergeLookup {
	/**
	 * Find the commit on the default branch that landed this slice's work.
	 * `sliceLabel` is the "M##-S##" coordinate. Implementations typically do
	 * `git log --grep=<sliceLabel> --format=%H <default-branch>` and return the
	 * first match. `--merges` is NOT recommended: squash-merges produce regular
	 * commits (not merge commits) with the label in the subject line, and
	 * filtering to `--merges` would miss them.
	 */
	findMergeCommit(sliceLabel: string): Promise<Result<string, DomainError>>;
}
