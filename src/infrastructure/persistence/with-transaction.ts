import { renameSync, rmdirSync, unlinkSync } from "node:fs";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { transactionRollbackError } from "../../domain/errors/transaction-rollback.error.js";
import type { TransactionRunner } from "../../domain/ports/transaction-runner.port.js";

/**
 * Writer convention: surface in-tx business errors via a closure-captured
 * variable (e.g. `let businessError: DomainError | null = null`) and return
 * normally, rather than throwing a sentinel Error subclass. The tx commits
 * when the business call returns a Result failure AND no rows changed, or
 * the body can choose to no-op. Throwing is reserved for true rollback
 * situations (DB write failed, precondition re-check failed). This keeps
 * the public error code intact without wrapping in TRANSACTION_ROLLBACK.
 */

export interface TxOutcome<T> {
	data: T;
	tmpRenames: Array<[string, string]>;
}

export interface WithTxSuccess<T> {
	ok: true;
	data: T;
	warnings: DomainError[];
}

export interface WithTxFailure {
	ok: false;
	error: DomainError;
}

export type WithTxResult<T> = WithTxSuccess<T> | WithTxFailure;

/**
 * Runs `body` inside a SQLite transaction. The body must be synchronous.
 * Stage FS writes to *.tmp paths BEFORE calling this helper; return their
 * [tmp, final] rename pairs from the body. On commit, the helper renames
 * each pair. On throw, the DB rolls back and the helper unlinks any tmps
 * listed in `preStagedTmps` (best-effort) so callers don't leak artifacts.
 *
 * `preStagedTmps` lets callers hand off cleanup responsibility: list every
 * *.tmp path created before entering the tx, and the helper will unlink them
 * on the error path (the body threw before returning a tmpRenames outcome).
 *
 * `preStagedDirs` lets callers hand off directory cleanup: list every
 * directory the caller just created (only directories that did NOT exist
 * before the writer ran). On rollback, the helper attempts rmdirSync on
 * each; this is safe because rmdirSync refuses to remove non-empty
 * directories, so pre-existing / shared state is never nuked.
 * Order the list leaf-first so deeper dirs are removed before their parents.
 *
 * Post-commit rename failures produce a PartialSuccessWarning in `warnings`;
 * the DB tx is already durable.
 */
export const withTransaction = async <T>(
	runner: TransactionRunner,
	body: () => TxOutcome<T>,
	preStagedTmps: string[] = [],
	preStagedDirs: string[] = [],
): Promise<WithTxResult<T>> => {
	let outcome: TxOutcome<T>;
	try {
		outcome = runner.transaction(body);
	} catch (e) {
		// On throw, the DB transaction rolled back. Unlink any *.tmp paths the
		// caller told us about (they were staged before entering the tx and are
		// now orphaned). Best-effort: we swallow unlink errors.
		cleanupTmps(preStagedTmps);
		cleanupDirs(preStagedDirs);
		return { ok: false, error: transactionRollbackError(e) };
	}

	const warnings: DomainError[] = [];
	for (const [tmp, final] of outcome.tmpRenames) {
		try {
			renameSync(tmp, final);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			warnings.push(partialSuccessWarning(`rename ${tmp} -> ${final} failed: ${msg}`, final));
			try {
				unlinkSync(tmp);
			} catch {
				// best-effort cleanup
			}
		}
	}

	return { ok: true, data: outcome.data, warnings };
};

/**
 * Explicit cleanup for tmps staged before the tx, when pre-staging succeeds
 * but the tx body throws. Callers who track their tmps externally can use
 * this to unlink them in an error branch.
 */
export const cleanupTmps = (tmps: string[]): void => {
	for (const t of tmps) {
		try {
			unlinkSync(t);
		} catch {
			// best-effort
		}
	}
};

/**
 * Explicit cleanup for directories the caller just created (not pre-existing)
 * on the rollback path. Uses rmdirSync (which refuses to remove non-empty
 * directories) so we never nuke unrelated state: if an unrelated caller
 * wrote siblings under the dir the removal fails harmlessly. Caller must
 * order leaf-first so child dirs are removed before their parents.
 */
export const cleanupDirs = (dirs: string[]): void => {
	for (const d of dirs) {
		try {
			rmdirSync(d);
		} catch {
			// best-effort — directory may be non-empty (unexpected siblings)
			// or may not exist; either way, do not leak an error.
		}
	}
};
