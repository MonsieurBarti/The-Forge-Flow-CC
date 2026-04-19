import type { DomainError } from "../errors/domain-error.js";
import type { Result } from "../result.js";

/**
 * Database initialization port. Narrow by design: only `init()`.
 * Transaction semantics live on a separate `TransactionRunner` port so that
 * consumers who only need a unit-of-work do not also get the initialization
 * surface (interface segregation).
 */
export interface DatabaseInit {
	init(): Result<void, DomainError>;
}
