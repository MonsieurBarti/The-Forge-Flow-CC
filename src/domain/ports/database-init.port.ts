import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

export interface DatabaseInit {
	init(): Result<void, DomainError>;

	/**
	 * Run `fn` inside a synchronous SQLite transaction. Auto-commits on return,
	 * auto-rolls back if `fn` throws (better-sqlite3 semantics).
	 * The function body must be synchronous; async FS work must be staged before
	 * the transaction and finalized after (see withTransaction helper).
	 */
	transaction<T>(fn: () => T): T;
}
