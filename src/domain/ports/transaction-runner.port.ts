/**
 * Runs a synchronous function inside a unit-of-work. Adapters decide the
 * concrete mechanism (SQLite transaction, in-memory snapshot, etc.). The
 * contract: on throw, observable state is rolled back; on return, changes
 * are committed.
 *
 * Keep the body synchronous. Stage async FS work before calling, and
 * finalize after (see the `withTransaction` helper).
 */
export interface TransactionRunner {
	/**
	 * Run `fn` inside a transaction. Auto-commits on return, auto-rolls back
	 * if `fn` throws.
	 */
	transaction<T>(fn: () => T): T;
}
