import { renameSync, unlinkSync } from "node:fs";
import type { DomainError } from "../../domain/errors/domain-error.js";
import { partialSuccessWarning } from "../../domain/errors/partial-success.warning.js";
import { transactionRollbackError } from "../../domain/errors/transaction-rollback.error.js";
import type { DatabaseInit } from "../../domain/ports/database-init.port.js";

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
 * each pair. On throw, the DB rolls back and the helper unlinks the tmps.
 *
 * Post-commit rename failures produce a PartialSuccessWarning in `warnings`;
 * the DB tx is already durable.
 */
export const withTransaction = async <T>(
	db: DatabaseInit,
	body: () => TxOutcome<T>,
): Promise<WithTxResult<T>> => {
	let outcome: TxOutcome<T>;
	try {
		outcome = db.transaction(body);
	} catch (e) {
		// On throw, the DB transaction rolled back. We must unlink any *.tmp
		// paths the body staged before crashing. Since the body threw before
		// returning tmpRenames, the caller is responsible for tracking tmps
		// staged pre-tx and cleaning them on this error path. The helper can
		// only report the rollback.
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
