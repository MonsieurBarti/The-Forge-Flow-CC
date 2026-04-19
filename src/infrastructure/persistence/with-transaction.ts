import { renameSync, unlinkSync } from "node:fs";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { transactionRollbackError } from "../../domain/errors/transaction-rollback.error.js";
import type { TransactionRunner } from "../../domain/ports/transaction-runner.port.js";

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
 * Post-commit rename failures produce a PartialSuccessWarning in `warnings`;
 * the DB tx is already durable.
 */
export const withTransaction = async <T>(
	runner: TransactionRunner,
	body: () => TxOutcome<T>,
	preStagedTmps: string[] = [],
): Promise<WithTxResult<T>> => {
	let outcome: TxOutcome<T>;
	try {
		outcome = runner.transaction(body);
	} catch (e) {
		// On throw, the DB transaction rolled back. Unlink any *.tmp paths the
		// caller told us about (they were staged before entering the tx and are
		// now orphaned). Best-effort: we swallow unlink errors.
		cleanupTmps(preStagedTmps);
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
